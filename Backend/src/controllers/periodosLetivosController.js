import pool from '../models/database.js';
import { registrarMovimentacao } from '../models/movimentacoesModel.js';
import { parsePositiveInt } from '../models/validacaoModel.js';

const STATUS_PERMITIDOS = new Set(['PLANEJADO', 'ATIVO', 'ENCERRADO']);
const DIAS_SEMANA_VALIDOS = new Set([1, 2, 3, 4, 5, 6, 7]);

function normalizarStatus(valor) {
  const status = String(valor || 'PLANEJADO').trim().toUpperCase();
  return STATUS_PERMITIDOS.has(status) ? status : null;
}

function dataValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));
}

function diaSemanaIso(dataIso) {
  const [ano, mes, dia] = String(dataIso).split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const diaJs = data.getUTCDay();
  return diaJs === 0 ? 7 : diaJs;
}

async function obterPeriodo(id, conn = pool) {
  const [linhas] = await conn.query(
    `SELECT id, ano, semestre,
            DATE_FORMAT(data_inicio, '%Y-%m-%d') AS dataInicio,
            DATE_FORMAT(data_fim, '%Y-%m-%d') AS dataFim,
            status, COALESCE(em_historico, FALSE) AS emHistorico,
            criado_em AS criadoEm, atualizado_em AS atualizadoEm
       FROM periodos_letivos
      WHERE id = ?`,
    [id]
  );
  return linhas[0] || null;
}

function periodoEncerrado(periodo) {
  return String(periodo?.status || '').toUpperCase() === 'ENCERRADO';
}

async function validarCursoAtividade({ idCurso, idAtividade }, conn = pool) {
  const [cursos] = await conn.query('SELECT id, nome FROM cursos WHERE id = ? AND ativo = TRUE', [idCurso]);
  if (!cursos.length) return { erro: 'Curso não encontrado ou inativo' };

  let atividade = null;
  if (idAtividade) {
    const [atividades] = await conn.query(
      `SELECT id, nome, id_curso AS idCurso
         FROM atividades_atendimento
        WHERE id = ? AND ativo = TRUE`,
      [idAtividade]
    );
    atividade = atividades[0] || null;
    if (!atividade || Number(atividade.idCurso) !== Number(idCurso)) {
      return { erro: 'A atividade selecionada não pertence ao curso informado' };
    }
  }

  return { curso: cursos[0], atividade };
}

export async function listarPeriodosLetivos(req, res) {
  try {
    const [periodos] = await pool.query(
      `SELECT id, ano, semestre,
              DATE_FORMAT(data_inicio, '%Y-%m-%d') AS dataInicio,
              DATE_FORMAT(data_fim, '%Y-%m-%d') AS dataFim,
              status, COALESCE(em_historico, FALSE) AS emHistorico,
              criado_em AS criadoEm, atualizado_em AS atualizadoEm
         FROM periodos_letivos
        ORDER BY ano DESC, semestre DESC`
    );
    res.json(periodos);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(503).json({
        message: 'A estrutura do banco está desatualizada para o calendário de frequência'
      });
    }
    console.error('Erro ao listar períodos letivos:', error);
    res.status(500).json({ message: 'Erro ao listar períodos letivos' });
  }
}

export async function enviarPeriodoParaHistorico(req, res) {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID do período inválido' });

  try {
    const periodo = await obterPeriodo(id);
    if (!periodo) return res.status(404).json({ message: 'Período letivo não encontrado' });
    if (!periodoEncerrado(periodo)) {
      return res.status(400).json({ message: 'Somente períodos encerrados podem ser enviados para o histórico' });
    }
    if (periodo.emHistorico === 1 || periodo.emHistorico === true) {
      return res.status(200).json(periodo);
    }

    await pool.query('UPDATE periodos_letivos SET em_historico = TRUE WHERE id = ?', [id]);

    try {
      await registrarMovimentacao({
        id_usuario: req.user?.id || null,
        tipo: 'Período letivo arquivado',
        descricao: `Período ${periodo.ano}/${periodo.semestre} enviado para o histórico`
      });
    } catch (erroAuditoria) {
      console.error('Erro ao auditar histórico do período letivo:', erroAuditoria);
    }

    return res.json(await obterPeriodo(id));
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(503).json({ message: 'A estrutura do banco está desatualizada para o histórico de semestres' });
    }
    console.error('Erro ao enviar período para histórico:', error);
    return res.status(500).json({ message: 'Erro ao enviar período para histórico' });
  }
}

export async function criarPeriodoLetivo(req, res) {
  const ano = Number.parseInt(req.body.ano, 10);
  const semestre = Number.parseInt(req.body.semestre, 10);
  const dataInicio = req.body.dataInicio ?? req.body.data_inicio;
  const dataFim = req.body.dataFim ?? req.body.data_fim;
  const status = normalizarStatus(req.body.status);

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return res.status(400).json({ message: 'Ano inválido' });
  }
  if (![1, 2].includes(semestre)) {
    return res.status(400).json({ message: 'Semestre deve ser 1 ou 2' });
  }
  if (!dataValida(dataInicio) || !dataValida(dataFim) || dataInicio > dataFim) {
    return res.status(400).json({ message: 'Período de datas inválido' });
  }
  if (!status) {
    return res.status(400).json({ message: 'Status do período inválido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sobrepostos] = await conn.query(
      `SELECT id, ano, semestre FROM periodos_letivos
        WHERE data_inicio <= ? AND data_fim >= ?
        LIMIT 1`,
      [dataFim, dataInicio]
    );
    if (sobrepostos.length) {
      await conn.rollback();
      return res.status(409).json({
        message: `As datas se sobrepõem ao período ${sobrepostos[0].ano}/${sobrepostos[0].semestre}`
      });
    }

    if (status === 'ATIVO') {
      const [ativos] = await conn.query("SELECT id FROM periodos_letivos WHERE status = 'ATIVO' LIMIT 1");
      if (ativos.length) {
        await conn.rollback();
        return res.status(409).json({ message: 'Já existe um período letivo ativo. Encerre-o antes de ativar outro.' });
      }
    }

    const [resultado] = await conn.query(
      `INSERT INTO periodos_letivos (ano, semestre, data_inicio, data_fim, status)
       VALUES (?, ?, ?, ?, ?)`,
      [ano, semestre, dataInicio, dataFim, status]
    );

    await conn.commit();

    try {
      await registrarMovimentacao({
        id_usuario: req.user?.id || null,
        tipo: 'Período letivo criado',
        descricao: `Período ${ano}/${semestre} criado`
      });
    } catch (erroAuditoria) {
      console.error('Erro ao auditar criação do período letivo:', erroAuditoria);
    }

    res.status(201).json(await obterPeriodo(resultado.insertId));
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Já existe um período para esse ano e semestre' });
    }
    console.error('Erro ao criar período letivo:', error);
    res.status(500).json({ message: 'Erro ao criar período letivo' });
  } finally {
    conn.release();
  }
}

export async function atualizarPeriodoLetivo(req, res) {
  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID do período inválido' });

  const periodoAtual = await obterPeriodo(id);
  if (!periodoAtual) return res.status(404).json({ message: 'Período letivo não encontrado' });
  if (periodoEncerrado(periodoAtual)) {
    return res.status(400).json({ message: 'Períodos encerrados ficam bloqueados para preservar o histórico' });
  }

  const ano = Number.parseInt(req.body.ano ?? periodoAtual.ano, 10);
  const semestre = Number.parseInt(req.body.semestre ?? periodoAtual.semestre, 10);
  const dataInicio = req.body.dataInicio ?? req.body.data_inicio ?? periodoAtual.dataInicio;
  const dataFim = req.body.dataFim ?? req.body.data_fim ?? periodoAtual.dataFim;
  const status = normalizarStatus(req.body.status ?? periodoAtual.status);

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100 || ![1, 2].includes(semestre)) {
    return res.status(400).json({ message: 'Ano ou semestre inválido' });
  }
  if (!dataValida(dataInicio) || !dataValida(dataFim) || dataInicio > dataFim) {
    return res.status(400).json({ message: 'Período de datas inválido' });
  }
  if (!status) return res.status(400).json({ message: 'Status do período inválido' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sobrepostos] = await conn.query(
      `SELECT id, ano, semestre FROM periodos_letivos
        WHERE id <> ? AND data_inicio <= ? AND data_fim >= ?
        LIMIT 1`,
      [id, dataFim, dataInicio]
    );
    if (sobrepostos.length) {
      await conn.rollback();
      return res.status(409).json({
        message: `As datas se sobrepõem ao período ${sobrepostos[0].ano}/${sobrepostos[0].semestre}`
      });
    }

    if (status === 'ATIVO') {
      const [ativos] = await conn.query(
        "SELECT id FROM periodos_letivos WHERE status = 'ATIVO' AND id <> ? LIMIT 1",
        [id]
      );
      if (ativos.length) {
        await conn.rollback();
        return res.status(409).json({ message: 'Já existe outro período letivo ativo' });
      }
    }

    await conn.query(
      `UPDATE periodos_letivos
          SET ano = ?, semestre = ?, data_inicio = ?, data_fim = ?, status = ?
        WHERE id = ?`,
      [ano, semestre, dataInicio, dataFim, status, id]
    );

    await conn.commit();
    res.json(await obterPeriodo(id));
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Já existe um período para esse ano e semestre' });
    }
    console.error('Erro ao atualizar período letivo:', error);
    res.status(500).json({ message: 'Erro ao atualizar período letivo' });
  } finally {
    conn.release();
  }
}


export async function copiarPeriodoLetivo(req, res) {
  const idOrigem = parsePositiveInt(req.params.id);
  const ano = Number.parseInt(req.body.ano, 10);
  const semestre = Number.parseInt(req.body.semestre, 10);
  const dataInicio = req.body.dataInicio ?? req.body.data_inicio;
  const dataFim = req.body.dataFim ?? req.body.data_fim;

  if (!idOrigem) return res.status(400).json({ message: 'Semestre de origem inválido' });
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100 || ![1, 2].includes(semestre)) {
    return res.status(400).json({ message: 'Ano ou semestre de destino inválido' });
  }
  if (!dataValida(dataInicio) || !dataValida(dataFim) || dataInicio > dataFim) {
    return res.status(400).json({ message: 'Período de datas inválido' });
  }

  const origem = await obterPeriodo(idOrigem);
  if (!origem) return res.status(404).json({ message: 'Semestre de origem não encontrado' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sobrepostos] = await conn.query(
      `SELECT id, ano, semestre FROM periodos_letivos
        WHERE data_inicio <= ? AND data_fim >= ? LIMIT 1`,
      [dataFim, dataInicio]
    );
    if (sobrepostos.length) {
      await conn.rollback();
      return res.status(409).json({ message: `As datas se sobrepõem ao período ${sobrepostos[0].ano}/${sobrepostos[0].semestre}` });
    }

    const [resultado] = await conn.query(
      `INSERT INTO periodos_letivos (ano, semestre, data_inicio, data_fim, status)
       VALUES (?, ?, ?, ?, 'PLANEJADO')`,
      [ano, semestre, dataInicio, dataFim]
    );

    const idDestino = resultado.insertId;
    await conn.query(
      `INSERT INTO grade_periodo_letivo (id_periodo, id_curso, id_atividade, dia_semana)
       SELECT ?, id_curso, id_atividade, dia_semana
         FROM grade_periodo_letivo
        WHERE id_periodo = ?`,
      [idDestino, idOrigem]
    );

    await conn.commit();

    try {
      await registrarMovimentacao({
        id_usuario: req.user?.id || null,
        tipo: 'Período letivo copiado',
        descricao: `Período ${origem.ano}/${origem.semestre} copiado para ${ano}/${semestre}`
      });
    } catch (erroAuditoria) {
      console.error('Erro ao auditar cópia do período letivo:', erroAuditoria);
    }

    res.status(201).json(await obterPeriodo(idDestino));
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Já existe um período para esse ano e semestre' });
    }
    console.error('Erro ao copiar período letivo:', error);
    res.status(500).json({ message: 'Erro ao copiar período letivo' });
  } finally {
    conn.release();
  }
}

export async function listarGradePeriodo(req, res) {
  try {
    const idPeriodo = parsePositiveInt(req.params.id);
    if (!idPeriodo) return res.status(400).json({ message: 'ID do período inválido' });

    const [grade] = await pool.query(
      `SELECT g.id, g.id_periodo AS idPeriodo,
              g.id_curso AS idCurso, c.nome AS curso,
              g.id_atividade AS idAtividade, aa.nome AS atividade,
              g.dia_semana AS diaSemana
         FROM grade_periodo_letivo g
         JOIN cursos c ON c.id = g.id_curso
         LEFT JOIN atividades_atendimento aa ON aa.id = g.id_atividade
        WHERE g.id_periodo = ?
        ORDER BY c.nome, aa.nome, g.dia_semana`,
      [idPeriodo]
    );

    res.json(grade);
  } catch (error) {
    console.error('Erro ao listar calendário do período:', error);
    res.status(500).json({ message: 'Erro ao listar calendário do período' });
  }
}

export async function salvarDiasGrade(req, res) {
  const idPeriodo = parsePositiveInt(req.params.id);
  const idCurso = parsePositiveInt(req.body.idCurso ?? req.body.id_curso);
  const idAtividade = req.body.idAtividade || req.body.id_atividade
    ? parsePositiveInt(req.body.idAtividade ?? req.body.id_atividade)
    : null;
  const diasSemana = Array.isArray(req.body.diasSemana ?? req.body.dias_semana)
    ? (req.body.diasSemana ?? req.body.dias_semana).map((dia) => Number.parseInt(dia, 10))
    : [];

  if (!idPeriodo || !idCurso) {
    return res.status(400).json({ message: 'Período e curso são obrigatórios' });
  }
  if (diasSemana.some((dia) => !DIAS_SEMANA_VALIDOS.has(dia)) || new Set(diasSemana).size !== diasSemana.length) {
    return res.status(400).json({ message: 'Dias da semana inválidos' });
  }

  const periodo = await obterPeriodo(idPeriodo);
  if (!periodo) return res.status(404).json({ message: 'Período letivo não encontrado' });
  if (periodoEncerrado(periodo)) return res.status(400).json({ message: 'Período encerrado não pode ter o calendário alterado' });

  const configuracao = await validarCursoAtividade({ idCurso, idAtividade });
  if (configuracao.erro) return res.status(400).json({ message: configuracao.erro });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existentes] = await conn.query(
      `SELECT id, dia_semana AS diaSemana
         FROM grade_periodo_letivo
        WHERE id_periodo = ? AND id_curso = ? AND id_atividade <=> ?`,
      [idPeriodo, idCurso, idAtividade]
    );

    const diasDesejados = new Set(diasSemana);
    const idsRemover = existentes
      .filter((item) => !diasDesejados.has(Number(item.diaSemana)))
      .map((item) => item.id);
    const diasExistentes = new Set(existentes.map((item) => Number(item.diaSemana)));
    const diasInserir = diasSemana.filter((dia) => !diasExistentes.has(dia));

    if (idsRemover.length) {
      await conn.query('DELETE FROM excecoes_periodo_letivo WHERE id_grade IN (?)', [idsRemover]);
      await conn.query('DELETE FROM grade_periodo_letivo WHERE id IN (?)', [idsRemover]);
    }

    if (diasInserir.length) {
      const valores = diasInserir.map((dia) => [idPeriodo, idCurso, idAtividade, dia]);
      await conn.query(
        `INSERT INTO grade_periodo_letivo (id_periodo, id_curso, id_atividade, dia_semana)
         VALUES ?`,
        [valores]
      );
    }

    await conn.commit();
    res.json({
      message: diasSemana.length ? 'Dias de atendimento atualizados' : 'Atendimento removido do calendário',
      diasSemana: [...diasDesejados].sort((a, b) => a - b)
    });
  } catch (error) {
    await conn.rollback();
    console.error('Erro ao salvar dias do calendário:', error);
    res.status(500).json({ message: 'Erro ao salvar dias do calendário' });
  } finally {
    conn.release();
  }
}

export async function listarExcecoesPeriodo(req, res) {
  try {
    const idPeriodo = parsePositiveInt(req.params.id);
    if (!idPeriodo) return res.status(400).json({ message: 'ID do período inválido' });

    const [excecoes] = await pool.query(
      `SELECT e.id, e.id_periodo AS idPeriodo, e.id_grade AS idGrade,
              DATE_FORMAT(e.data, '%Y-%m-%d') AS data,
              e.motivo,
              g.id_curso AS idCurso, c.nome AS curso,
              g.id_atividade AS idAtividade, aa.nome AS atividade,
              g.dia_semana AS diaSemana
         FROM excecoes_periodo_letivo e
         LEFT JOIN grade_periodo_letivo g ON g.id = e.id_grade
         LEFT JOIN cursos c ON c.id = g.id_curso
         LEFT JOIN atividades_atendimento aa ON aa.id = g.id_atividade
        WHERE e.id_periodo = ?
        ORDER BY e.data, c.nome, aa.nome`,
      [idPeriodo]
    );

    res.json(excecoes);
  } catch (error) {
    console.error('Erro ao listar datas sem atendimento:', error);
    res.status(500).json({ message: 'Erro ao listar datas sem atendimento' });
  }
}

export async function criarExcecaoPeriodo(req, res) {
  const idPeriodo = parsePositiveInt(req.params.id);
  const data = req.body.data;
  const escopo = String(req.body.escopo || 'GERAL').trim().toUpperCase();
  const motivo = String(req.body.motivo || '').trim().slice(0, 255) || null;
  const idCurso = req.body.idCurso ? parsePositiveInt(req.body.idCurso) : null;
  const idAtividade = req.body.idAtividade ? parsePositiveInt(req.body.idAtividade) : null;

  if (!idPeriodo || !dataValida(data)) {
    return res.status(400).json({ message: 'Período e data são obrigatórios' });
  }
  if (!['GERAL', 'ATENDIMENTO'].includes(escopo)) {
    return res.status(400).json({ message: 'Escopo da data sem atendimento é inválido' });
  }

  const periodo = await obterPeriodo(idPeriodo);
  if (!periodo) return res.status(404).json({ message: 'Período letivo não encontrado' });
  if (periodoEncerrado(periodo)) return res.status(400).json({ message: 'Período encerrado não pode ter exceções alteradas' });
  if (data < periodo.dataInicio || data > periodo.dataFim) {
    return res.status(400).json({ message: 'A data deve estar dentro do período letivo selecionado' });
  }

  let idGrade = null;
  if (escopo === 'ATENDIMENTO') {
    if (!idCurso) return res.status(400).json({ message: 'Selecione o atendimento que não ocorreu' });
    const configuracao = await validarCursoAtividade({ idCurso, idAtividade });
    if (configuracao.erro) return res.status(400).json({ message: configuracao.erro });

    const diaSemana = diaSemanaIso(data);
    const [grade] = await pool.query(
      `SELECT id
         FROM grade_periodo_letivo
        WHERE id_periodo = ?
          AND id_curso = ?
          AND id_atividade <=> ?
          AND dia_semana = ?
        LIMIT 1`,
      [idPeriodo, idCurso, idAtividade, diaSemana]
    );
    if (!grade.length) {
      return res.status(400).json({ message: 'Esse atendimento não está previsto no dia da semana da data informada' });
    }
    idGrade = grade[0].id;
  }

  try {
    const [duplicadas] = await pool.query(
      `SELECT id FROM excecoes_periodo_letivo
        WHERE id_periodo = ? AND data = ? AND id_grade <=> ?
        LIMIT 1`,
      [idPeriodo, data, idGrade]
    );
    if (duplicadas.length) {
      return res.status(400).json({ message: 'Essa data sem atendimento já está cadastrada' });
    }

    const [resultado] = await pool.query(
      `INSERT INTO excecoes_periodo_letivo (id_periodo, id_grade, data, motivo)
       VALUES (?, ?, ?, ?)`,
      [idPeriodo, idGrade, data, motivo]
    );

    res.status(201).json({ id: resultado.insertId, message: 'Data sem atendimento adicionada' });
  } catch (error) {
    console.error('Erro ao adicionar data sem atendimento:', error);
    res.status(500).json({ message: 'Erro ao adicionar data sem atendimento' });
  }
}

export async function removerExcecaoPeriodo(req, res) {
  try {
    const idPeriodo = parsePositiveInt(req.params.id);
    const idExcecao = parsePositiveInt(req.params.idExcecao);
    if (!idPeriodo || !idExcecao) return res.status(400).json({ message: 'Identificador inválido' });

    const periodo = await obterPeriodo(idPeriodo);
    if (!periodo) return res.status(404).json({ message: 'Período letivo não encontrado' });
    if (periodoEncerrado(periodo)) return res.status(400).json({ message: 'Período encerrado não pode ter exceções alteradas' });

    const [resultado] = await pool.query(
      'DELETE FROM excecoes_periodo_letivo WHERE id = ? AND id_periodo = ?',
      [idExcecao, idPeriodo]
    );
    if (!resultado.affectedRows) return res.status(404).json({ message: 'Data sem atendimento não encontrada' });
    res.json({ message: 'Data sem atendimento removida' });
  } catch (error) {
    console.error('Erro ao remover data sem atendimento:', error);
    res.status(500).json({ message: 'Erro ao remover data sem atendimento' });
  }
}
