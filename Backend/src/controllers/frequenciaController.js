import pool from '../models/database.js';
import { registrarMovimentacao } from '../models/movimentacoesModel.js';
import { parsePagination, parsePositiveInt } from '../models/validacaoModel.js';

async function consultaFrequencias(filtros = {}) {
  const parametros = [];
  let consulta = `SELECT f.id, f.id_paciente AS idPaciente, p.nome AS paciente,
    f.id_atividade AS idAtividade, aa.nome AS atividade, c.id AS idCurso, c.nome AS curso,
    f.id_profissional AS idProfissional, u.nome AS profissional,
    DATE_FORMAT(f.registrado_em, '%Y-%m-%d') AS data,
    DATE_FORMAT(f.registrado_em, '%H:%i') AS horario,
    f.registrado_em AS registradoEm,
    f.observacoes AS observacoes
    FROM frequencia f 
    JOIN pacientes p ON p.id = f.id_paciente
    LEFT JOIN atividades_atendimento aa ON aa.id = f.id_atividade
    LEFT JOIN cursos c ON c.id = aa.id_curso
    LEFT JOIN usuarios u ON u.id = f.id_profissional
    WHERE 1 = 1`;

  if (Array.isArray(filtros.idsPacientes) && filtros.idsPacientes.length > 0) {
    const marcadores = filtros.idsPacientes.map(() => '?').join(', ');
    consulta += ` AND f.id_paciente IN (${marcadores})`;
    parametros.push(...filtros.idsPacientes);
  } else if (filtros.idPaciente) {
    consulta += ' AND f.id_paciente = ?';
    parametros.push(filtros.idPaciente);
  }
  if (filtros.dataInicio) { consulta += ' AND f.registrado_em >= ?'; parametros.push(filtros.dataInicio); }
  if (filtros.dataFim) { consulta += ' AND f.registrado_em < DATE_ADD(?, INTERVAL 1 DAY)'; parametros.push(filtros.dataFim); }
  if (filtros.idCurso) { consulta += ' AND aa.id_curso = ?'; parametros.push(filtros.idCurso); }
  if (filtros.idCursoUsuario) { consulta += ' AND aa.id_curso = ?'; parametros.push(filtros.idCursoUsuario); }
  if (filtros.idAtividade) { consulta += ' AND f.id_atividade = ?'; parametros.push(filtros.idAtividade); }
  if (filtros.idProfissional) { consulta += ' AND f.id_profissional = ?'; parametros.push(filtros.idProfissional); }
  if (filtros.nomePaciente) { consulta += ' AND p.nome LIKE ?'; parametros.push(`%${filtros.nomePaciente}%`); }
  consulta += ' ORDER BY f.registrado_em DESC, f.id DESC';
  const [registros] = await pool.query(consulta, parametros);
  return registros;
}


async function validarEscopoProfessorFrequencia(req, { idCurso = null, idAtividade = null } = {}) {
  if (req.user?.role !== 'PROFESSOR') return null;

  const idCursoUsuario = parsePositiveInt(req.user?.idCurso);
  if (!idCursoUsuario) {
    return { status: 403, message: 'Usuário sem curso vinculado' };
  }

  if (idCurso && Number(idCurso) !== Number(idCursoUsuario)) {
    return { status: 403, message: 'Você só pode consultar frequências do seu próprio curso' };
  }

  if (idAtividade) {
    const [atividades] = await pool.query(
      'SELECT id FROM atividades_atendimento WHERE id = ? AND id_curso = ? LIMIT 1',
      [idAtividade, idCursoUsuario]
    );
    if (!atividades.length) {
      return { status: 403, message: 'A atividade informada não pertence ao seu curso' };
    }
  }

  return null;
}


function normalizarDataIso(valor) {
  const texto = String(valor || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function criarDataUtc(dataIso) {
  const [ano, mes, dia] = String(dataIso).split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatarDataUtc(data) {
  return data.toISOString().slice(0, 10);
}

function maiorData(...datas) {
  return datas.filter(Boolean).sort().at(-1) || null;
}

function menorData(...datas) {
  return datas.filter(Boolean).sort().at(0) || null;
}

function contarOcorrenciasGrade(inicio, fim, diaSemana) {
  if (!inicio || !fim || inicio > fim) return [];

  const atual = criarDataUtc(inicio);
  const limite = criarDataUtc(fim);
  const ocorrencias = [];

  while (atual <= limite) {
    const diaIso = atual.getUTCDay() === 0 ? 7 : atual.getUTCDay();
    if (diaIso === Number(diaSemana)) ocorrencias.push(formatarDataUtc(atual));
    atual.setUTCDate(atual.getUTCDate() + 1);
  }

  return ocorrencias;
}

async function montarCalendarioFrequencia(filtros = {}) {
  const idsAtividadesEscopo = [...new Set(
    (Array.isArray(filtros.idsAtividadesEscopo) ? filtros.idsAtividadesEscopo : [])
      .map((id) => Number(id))
      .filter(Boolean)
  )];

  if (filtros.idAtividade && !idsAtividadesEscopo.includes(Number(filtros.idAtividade))) {
    idsAtividadesEscopo.push(Number(filtros.idAtividade));
  }

  const [periodos] = await pool.query(
    `SELECT id, ano, semestre,
            DATE_FORMAT(data_inicio, '%Y-%m-%d') AS dataInicio,
            DATE_FORMAT(data_fim, '%Y-%m-%d') AS dataFim,
            status
       FROM periodos_letivos
      WHERE data_inicio <= ? AND data_fim >= ?
        AND status IN ('ATIVO','ENCERRADO')
      ORDER BY data_inicio`,
    [filtros.dataFim, filtros.dataInicio]
  );

  if (!periodos.length) {
    return {
      disponivel: false,
      motivo: 'Não há calendário de frequência configurado para o período selecionado.',
      datasPrevistas: [],
      datasPrevistasPorAtividade: {},
      periodos: []
    };
  }

  // Sem participação e sem atividade específica não há uma grade individual a
  // validar. O relatório pode retornar vazio sem inventar um calendário global.
  if (!idsAtividadesEscopo.length) {
    return {
      disponivel: true,
      motivo: null,
      datasPrevistas: [],
      datasPrevistasPorAtividade: {},
      periodos,
      escopo: filtros.idCurso || filtros.idCursoUsuario ? 'CURSO' : 'TODOS_CURSOS'
    };
  }

  const marcadoresAtividades = idsAtividadesEscopo.map(() => '?').join(', ');
  const parametrosAtividades = [...idsAtividadesEscopo];
  let consultaAtividades = `SELECT id, id_curso AS idCurso, nome
                              FROM atividades_atendimento
                             WHERE ativo = TRUE
                               AND id IN (${marcadoresAtividades})`;
  const idCursoAlvo = filtros.idCurso || filtros.idCursoUsuario || null;
  if (idCursoAlvo) {
    consultaAtividades += ' AND id_curso = ?';
    parametrosAtividades.push(idCursoAlvo);
  }
  const [atividades] = await pool.query(consultaAtividades, parametrosAtividades);

  if (atividades.length !== idsAtividadesEscopo.length) {
    return {
      disponivel: false,
      motivo: 'Uma ou mais atividades do filtro não foram encontradas ou não pertencem ao curso selecionado.',
      datasPrevistas: [],
      datasPrevistasPorAtividade: {},
      periodos
    };
  }

  const idsPeriodos = periodos.map((periodo) => Number(periodo.id));
  const marcadoresPeriodos = idsPeriodos.map(() => '?').join(', ');
  const [grades] = await pool.query(
    `SELECT id, id_periodo AS idPeriodo, id_curso AS idCurso,
            id_atividade AS idAtividade, dia_semana AS diaSemana
       FROM grade_periodo_letivo
      WHERE id_periodo IN (${marcadoresPeriodos})
        AND id_atividade IN (${marcadoresAtividades})
      ORDER BY id_periodo, id_atividade, dia_semana`,
    [...idsPeriodos, ...idsAtividadesEscopo]
  );

  const configuracoesAusentes = [];
  atividades.forEach((atividade) => {
    periodos.forEach((periodo) => {
      const inicio = maiorData(filtros.dataInicio, normalizarDataIso(periodo.dataInicio));
      const fim = menorData(filtros.dataFim, normalizarDataIso(periodo.dataFim));
      if (!inicio || !fim || inicio > fim) return;

      const possuiGrade = grades.some((grade) =>
        Number(grade.idPeriodo) === Number(periodo.id) &&
        Number(grade.idAtividade) === Number(atividade.id)
      );
      if (!possuiGrade) {
        configuracoesAusentes.push({ atividade, periodo });
      }
    });
  });

  if (configuracoesAusentes.length) {
    const nomes = [...new Set(configuracoesAusentes.map((item) => item.atividade.nome))];
    const exibidos = nomes.slice(0, 3).map((nome) => `“${nome}”`).join(', ');
    const restante = nomes.length > 3 ? ` e mais ${nomes.length - 3}` : '';
    return {
      disponivel: false,
      motivo: nomes.length === 1
        ? `A atividade ${exibidos} não possui dias de atendimento cadastrados no calendário de frequência para o período selecionado.`
        : `Existem atividades sem dias de atendimento cadastrados no calendário de frequência: ${exibidos}${restante}.`,
      datasPrevistas: [],
      datasPrevistasPorAtividade: {},
      periodos,
      atividadesSemCalendario: nomes
    };
  }

  const [excecoes] = await pool.query(
    `SELECT id_periodo AS idPeriodo, id_grade AS idGrade,
            DATE_FORMAT(data, '%Y-%m-%d') AS data
       FROM excecoes_periodo_letivo
      WHERE id_periodo IN (${marcadoresPeriodos})`,
    idsPeriodos
  );
  const excecoesGerais = new Set(
    excecoes.filter((item) => !item.idGrade).map((item) => `${item.idPeriodo}|${item.data}`)
  );
  const excecoesEspecificas = new Set(
    excecoes.filter((item) => item.idGrade).map((item) => `${item.idGrade}|${item.data}`)
  );

  const datasPrevistasPorAtividade = {};
  const todasDatas = new Set();
  idsAtividadesEscopo.forEach((id) => { datasPrevistasPorAtividade[id] = new Set(); });

  grades.forEach((grade) => {
    const periodo = periodos.find((item) => Number(item.id) === Number(grade.idPeriodo));
    if (!periodo) return;
    const inicio = maiorData(filtros.dataInicio, normalizarDataIso(periodo.dataInicio));
    const fim = menorData(filtros.dataFim, normalizarDataIso(periodo.dataFim));

    contarOcorrenciasGrade(inicio, fim, grade.diaSemana).forEach((dataOcorrencia) => {
      if (excecoesGerais.has(`${periodo.id}|${dataOcorrencia}`)) return;
      if (excecoesEspecificas.has(`${grade.id}|${dataOcorrencia}`)) return;
      datasPrevistasPorAtividade[grade.idAtividade]?.add(dataOcorrencia);
      todasDatas.add(dataOcorrencia);
    });
  });

  const serializado = Object.fromEntries(
    Object.entries(datasPrevistasPorAtividade).map(([id, datas]) => [id, [...datas].sort()])
  );

  return {
    disponivel: true,
    motivo: null,
    datasPrevistas: [...todasDatas].sort(),
    datasPrevistasPorAtividade: serializado,
    periodos,
    escopo: filtros.idAtividade ? 'ATIVIDADE' : (idCursoAlvo ? 'CURSO' : 'TODOS_CURSOS'),
    idCurso: idCursoAlvo ? Number(idCursoAlvo) : null,
    idAtividade: filtros.idAtividade || null
  };
}

async function existePeriodoLetivoNoIntervalo(dataInicio, dataFim) {
  const [periodos] = await pool.query(
    `SELECT id
       FROM periodos_letivos
      WHERE data_inicio <= ?
        AND data_fim >= ?
        AND status IN ('ATIVO','ENCERRADO')
      LIMIT 1`,
    [dataFim, dataInicio]
  );
  return periodos.length > 0;
}

async function validarDataRegistroFrequencia(conn, atividade) {
  // Usa a data do próprio MySQL para evitar divergência de fuso entre navegador,
  // Node e servidor de banco.
  const [[relogio]] = await conn.query(
    `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS dataAtual,
            WEEKDAY(CURDATE()) + 1 AS diaSemana`
  );

  const [periodos] = await conn.query(
    `SELECT id, ano, semestre, status
       FROM periodos_letivos
      WHERE CURDATE() BETWEEN data_inicio AND data_fim
      ORDER BY FIELD(status, 'ATIVO', 'PLANEJADO', 'ENCERRADO'), data_inicio DESC
      LIMIT 1`
  );

  if (!periodos.length) {
    return {
      valido: false,
      statusHttp: 409,
      codigo: 'CALENDARIO_INEXISTENTE',
      mensagem: 'Não há calendário de frequência configurado para a data de hoje. Cadastre e ative um semestre no Painel de Gerenciamento antes de registrar presença.'
    };
  }

  const periodo = periodos[0];
  if (periodo.status !== 'ATIVO') {
    return {
      valido: false,
      statusHttp: 409,
      codigo: 'SEMESTRE_NAO_ATIVO',
      mensagem: periodo.status === 'ENCERRADO'
        ? 'O semestre correspondente à data de hoje está encerrado e não aceita novos registros de presença.'
        : 'O semestre correspondente à data de hoje ainda está planejado. Ative o semestre antes de registrar presença.'
    };
  }

  // A atividade precisa possuir seus próprios dias de atendimento.
  // Não há herança/fallback da grade geral do curso para registrar presença.
  const [gradeAtividade] = await conn.query(
    `SELECT id, id_atividade AS idAtividade, dia_semana AS diaSemana
       FROM grade_periodo_letivo
      WHERE id_periodo = ?
        AND id_curso = ?
        AND id_atividade = ?
      ORDER BY dia_semana`,
    [periodo.id, atividade.idCurso, atividade.id]
  );

  if (!gradeAtividade.length) {
    return {
      valido: false,
      statusHttp: 409,
      codigo: 'ATIVIDADE_SEM_DIAS',
      mensagem: `A atividade "${atividade.atividade}" não possui dias de atendimento cadastrados no calendário de frequência. Configure o calendário antes de registrar presença.`
    };
  }

  const aplicaveis = gradeAtividade.filter(
    (item) => Number(item.diaSemana) === Number(relogio.diaSemana)
  );

  if (!aplicaveis.length) {
    return {
      valido: false,
      statusHttp: 409,
      codigo: 'DIA_NAO_CONFIGURADO',
      mensagem: `A atividade "${atividade.atividade}" não está programada para atendimento hoje. Verifique os dias cadastrados no calendário de frequência do semestre ${periodo.ano}/${periodo.semestre}.`
    };
  }

  const idsGrade = aplicaveis.map((item) => item.id);
  const [excecoes] = await conn.query(
    `SELECT id_grade AS idGrade
       FROM excecoes_periodo_letivo
      WHERE id_periodo = ?
        AND data = CURDATE()
        AND (id_grade IS NULL OR id_grade IN (?))`,
    [periodo.id, idsGrade]
  );

  const excecaoGeral = excecoes.some((item) => item.idGrade === null);
  const gradesBloqueadas = new Set(
    excecoes.filter((item) => item.idGrade !== null).map((item) => Number(item.idGrade))
  );
  const possuiGradeValida = aplicaveis.some((item) => !gradesBloqueadas.has(Number(item.id)));

  if (excecaoGeral || !possuiGradeValida) {
    return {
      valido: false,
      statusHttp: 409,
      codigo: 'DATA_SEM_ATENDIMENTO',
      mensagem: `Não é possível registrar presença em ${relogio.dataAtual}. A data está marcada como sem atendimento no calendário de frequência.`
    };
  }

  return { valido: true, periodo, dataAtual: relogio.dataAtual };
}

export const frequenciaController = {
  getContext: async (req, res) => {
    try {
      const supervisor = req.user.role === 'SUPERVISOR';
      if (!supervisor && !parsePositiveInt(req.user?.idCurso)) {
        return res.status(403).json({ message: 'Usuário sem curso vinculado' });
      }
      
      // Obter cursos de acordo com o papel do usuário
      const [cursos] = await pool.query(
        supervisor 
          ? 'SELECT id, nome AS nome, ativo FROM cursos WHERE ativo = TRUE ORDER BY nome' 
          : 'SELECT id, nome AS nome, ativo FROM cursos WHERE ativo = TRUE AND id = ? ORDER BY nome',
        supervisor ? [] : [req.user.idCurso]
      );
      
      // Obter professores ativos da tabela usuarios
      const [professores] = await pool.query(
        supervisor
          ? 'SELECT id, nome, id_curso AS idCurso FROM usuarios WHERE papel = ? AND ativo = TRUE AND oculto = FALSE ORDER BY nome'
          : 'SELECT id, nome, id_curso AS idCurso FROM usuarios WHERE papel = ? AND id_curso = ? AND ativo = TRUE AND oculto = FALSE ORDER BY nome',
        supervisor ? ['PROFESSOR'] : ['PROFESSOR', req.user.idCurso]
      );
      
      res.json({ 
        usuario: { 
          id: req.user.id, 
          nome: req.user.name, 
          papel: req.user.role, 
          idCurso: req.user.idCurso 
        }, 
        supervisor, 
        cursos, 
        professores 
      });
    } catch (error) {
      console.error('Erro ao carregar contexto da frequência:', error);
      res.status(500).json({ message: 'Erro ao carregar contexto da frequência' });
    }
  },

  getHistory: async (req, res) => {
    try {
      const idPaciente = req.query.id_paciente ? parsePositiveInt(req.query.id_paciente) : null;
      const idCurso = req.query.id_curso ? parsePositiveInt(req.query.id_curso) : null;
      const idAtividade = req.query.id_atividade ? parsePositiveInt(req.query.id_atividade) : null;
      const { limit, offset } = parsePagination(req.query.limit, req.query.offset, { limit: 50, maxLimit: 200 });
      if (req.query.id_paciente && !idPaciente) return res.status(400).json({ message: 'ID do paciente inválido' });
      if (req.query.id_curso && !idCurso) return res.status(400).json({ message: 'ID do curso inválido' });
      if (req.query.id_atividade && !idAtividade) return res.status(400).json({ message: 'ID da atividade inválido' });

      const erroEscopo = await validarEscopoProfessorFrequencia(req, { idCurso, idAtividade });
      if (erroEscopo) return res.status(erroEscopo.status).json({ message: erroEscopo.message });
      
      const registros = await consultaFrequencias({
        idPaciente, 
        dataInicio: req.query.data_inicio || req.query.start_date, 
        dataFim: req.query.data_fim || req.query.end_date,
        idCurso,
        idAtividade,
        idProfissional: req.user.role === 'SUPERVISOR' && req.query.id_profissional ? parsePositiveInt(req.query.id_profissional) : null,
        idCursoUsuario: req.user.role === 'PROFESSOR' ? req.user.idCurso : null
      });
      res.json({ data: registros.slice(offset, offset + limit), pagination: { total: registros.length, limit, offset } });
    } catch (error) {
      console.error('Erro ao listar histórico de frequência:', error);
      res.status(500).json({ message: 'Erro ao listar histórico de frequência' });
    }
  },

  getFrequencyReport: async (req, res) => {
    try {
      const dataInicio = normalizarDataIso(req.query.data_inicio || req.query.start_date);
      const dataFim = normalizarDataIso(req.query.data_fim || req.query.end_date);
      if (!dataInicio || !dataFim) return res.status(400).json({ message: 'Data inicial e final são obrigatórias' });
      if (dataInicio > dataFim) return res.status(400).json({ message: 'Data inicial não pode ser maior que a data final' });

      const possuiPeriodoLetivo = await existePeriodoLetivoNoIntervalo(dataInicio, dataFim);
      if (!possuiPeriodoLetivo) {
        return res.status(409).json({
          code: 'CALENDARIO_INEXISTENTE',
          message: 'Não há calendário de frequência configurado para o período selecionado. Cadastre um semestre no Painel de Gerenciamento antes de gerar o relatório.'
        });
      }

      const idsPacientesRaw = req.query.ids_pacientes || req.query.patient_ids || '';
      let idsPacientes = [];

      if (idsPacientesRaw) {
        const partes = String(idsPacientesRaw)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        const idsConvertidos = partes.map((item) => parsePositiveInt(item));
        if (idsConvertidos.some((id) => !id)) {
          return res.status(400).json({ message: 'Lista de pacientes inválida' });
        }

        idsPacientes = [...new Set(idsConvertidos)];
        if (idsPacientes.length > 200) {
          return res.status(400).json({ message: 'Selecione no máximo 200 pacientes por filtro específico' });
        }
      }

      const idPacienteRaw = idsPacientes.length === 0 ? (req.query.id_paciente || req.query.patient_id) : null;
      const idPaciente = idPacienteRaw ? parsePositiveInt(idPacienteRaw) : null;
      const idCurso = req.query.id_curso ? parsePositiveInt(req.query.id_curso) : null;
      const idAtividade = req.query.id_atividade ? parsePositiveInt(req.query.id_atividade) : null;
      if (idPacienteRaw && !idPaciente) return res.status(400).json({ message: 'ID do paciente inválido' });
      if (req.query.id_curso && !idCurso) return res.status(400).json({ message: 'ID do curso inválido' });
      if (req.query.id_atividade && !idAtividade) return res.status(400).json({ message: 'ID da atividade inválido' });

      const erroEscopo = await validarEscopoProfessorFrequencia(req, { idCurso, idAtividade });
      if (erroEscopo) return res.status(erroEscopo.status).json({ message: erroEscopo.message });

      const idProfissional = req.user.role === 'SUPERVISOR' && req.query.id_profissional
        ? parsePositiveInt(req.query.id_profissional)
        : null;
      const idCursoUsuario = req.user.role === 'PROFESSOR' ? req.user.idCurso : null;

      const filtrosBase = {
        dataInicio,
        dataFim,
        idsPacientes,
        idPaciente,
        nomePaciente: idsPacientes.length === 0 ? (req.query.nome_paciente || req.query.patient_name) : null,
        idCurso,
        idAtividade,
        idProfissional,
        idCursoUsuario
      };

      const registros = await consultaFrequencias(filtrosBase);

      // O calendário do relatório representa os DIAS DE ATENDIMENTO disponíveis
      // no escopo selecionado, e não uma obrigação de o paciente participar de
      // todas as atividades. Por isso o escopo não pode depender apenas das
      // atividades em que o paciente já possui presença.
      const parametrosEscopo = [dataFim, dataInicio];
      let consultaEscopo = `
        SELECT DISTINCT aa.id
          FROM atividades_atendimento aa
          JOIN grade_periodo_letivo g ON g.id_atividade = aa.id
          JOIN periodos_letivos pl ON pl.id = g.id_periodo
         WHERE aa.ativo = TRUE
           AND pl.status IN ('ATIVO','ENCERRADO')
           AND pl.data_inicio <= ?
           AND pl.data_fim >= ?`;

      const idCursoEscopo = idCurso || idCursoUsuario || null;
      if (idCursoEscopo) {
        consultaEscopo += ' AND aa.id_curso = ?';
        parametrosEscopo.push(idCursoEscopo);
      }
      if (idAtividade) {
        consultaEscopo += ' AND aa.id = ?';
        parametrosEscopo.push(idAtividade);
      }

      const [atividadesEscopo] = await pool.query(consultaEscopo, parametrosEscopo);
      const idsAtividadesEscopo = atividadesEscopo.map((item) => Number(item.id)).filter(Boolean);

      // Quando uma atividade específica foi solicitada, ela precisa existir no
      // calendário mesmo que ainda não tenha nenhuma presença registrada.
      if (idAtividade && !idsAtividadesEscopo.includes(Number(idAtividade))) {
        idsAtividadesEscopo.push(Number(idAtividade));
      }

      const calendario = await montarCalendarioFrequencia({
        ...filtrosBase,
        idsAtividadesEscopo
      });

      if (!calendario.disponivel) {
        return res.status(409).json({
          code: 'CALENDARIO_NAO_CONFIGURADO',
          message: calendario.motivo || 'O calendário de frequência não está configurado para o filtro selecionado.'
        });
      }

      const agrupado = new Map();
      const garantirPaciente = (id, nome = '') => {
        const chave = Number(id);
        if (!agrupado.has(chave)) {
          agrupado.set(chave, {
            idPaciente: chave,
            nomePaciente: nome || '',
            totalParticipacoes: 0,
            registros: [],
            _datasPresenca: new Set()
          });
        } else if (nome && !agrupado.get(chave).nomePaciente) {
          agrupado.get(chave).nomePaciente = nome;
        }
        return agrupado.get(chave);
      };

      registros.forEach((registro) => {
        const item = garantirPaciente(registro.idPaciente, registro.paciente);
        item.totalParticipacoes += 1;
        item._datasPresenca.add(registro.data);
        item.registros.push({
          data: registro.data,
          horario: registro.horario || '',
          idCurso: registro.idCurso,
          nomeCurso: registro.curso,
          idAtividade: registro.idAtividade,
          nomeAtividade: registro.atividade,
          idProfissional: registro.idProfissional,
          nomeProfissional: registro.profissional
        });
      });

      const idsSolicitados = idsPacientes.length ? idsPacientes : (idPaciente ? [idPaciente] : []);
      if (idsSolicitados.length) {
        const marcadores = idsSolicitados.map(() => '?').join(', ');
        const [pacientesSelecionados] = await pool.query(
          `SELECT id, nome FROM pacientes WHERE id IN (${marcadores})`,
          idsSolicitados
        );
        pacientesSelecionados.forEach((paciente) => garantirPaciente(paciente.id, paciente.nome));
      }

      const datasPrevistasPorAtividade = calendario.datasPrevistasPorAtividade || {};
      const datasAtendimento = new Set(calendario.datasPrevistas || []);

      const report = [...agrupado.values()]
        .map((item) => {
          // A participação no período é calculada por DIA, não por atividade.
          // Se o paciente fizer 1, 2 ou 3 atividades no mesmo dia, continua
          // contando como um único dia com presença.
          const datasPresencaValidas = new Set(
            [...item._datasPresenca].filter((data) => datasAtendimento.has(data))
          );

          const diasAtendimento = datasAtendimento.size;
          const diasComPresenca = datasPresencaValidas.size;
          const calculoFrequenciaDisponivel = calendario.disponivel && diasAtendimento > 0;
          const percentualFrequencia = calculoFrequenciaDisponivel
            ? Number(((diasComPresenca / diasAtendimento) * 100).toFixed(1))
            : null;

          const registrosClassificados = item.registros.map((registro) => {
            const datasAtividade = registro.idAtividade
              ? (datasPrevistasPorAtividade[Number(registro.idAtividade)] || [])
              : [];
            return {
              ...registro,
              compativelCalendario: datasAtividade.includes(registro.data)
            };
          }).sort((a, b) => {
            if (a.compativelCalendario !== b.compativelCalendario) return a.compativelCalendario ? -1 : 1;
            return `${b.data} ${b.horario || ''}`.localeCompare(`${a.data} ${a.horario || ''}`);
          });
          return {
            idPaciente: item.idPaciente,
            nomePaciente: item.nomePaciente,
            diasComPresenca,
            totalParticipacoes: item.totalParticipacoes,
            datasPresenca: [...datasPresencaValidas].sort(),
            registros: registrosClassificados,
            diasAtendimento,
            percentualFrequencia,
            calculoFrequenciaDisponivel
          };
        })
        .sort((a, b) => String(a.nomePaciente).localeCompare(String(b.nomePaciente), 'pt-BR'));

      const periodDays = Math.floor((criarDataUtc(dataFim) - criarDataUtc(dataInicio)) / 86400000) + 1;
      res.json({
        period: {
          start_date: dataInicio,
          end_date: dataFim,
          period_days: periodDays,
          periodos_letivos: calendario.periodos || []
        },
        attendance_method: 'participacao_por_dias_de_atendimento',
        calendar: {
          available: calendario.disponivel === true,
          reason: calendario.motivo || null,
          scope: calendario.escopo || null,
          expected_dates: calendario.datasPrevistas || [],
          expected_dates_by_activity: calendario.datasPrevistasPorAtividade || {}
        },
        report
      });
    } catch (error) {
      if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(503).json({
          message: 'A estrutura do banco está desatualizada para o calendário de frequência.'
        });
      }
      console.error('Erro ao gerar relatório de frequência:', error);
      res.status(500).json({ message: 'Erro ao gerar relatório de frequência' });
    }
  },

  criarFrequencia: async (req, res) => {
    try {
      // Validação de ambiguidade: não permitir idPaciente e idsPacientes simultaneamente
      const temIdSingular = req.body.idPaciente !== undefined && req.body.idPaciente !== null;
      const temIdsPlural = req.body.idsPacientes !== undefined && req.body.idsPacientes !== null;

      if (temIdSingular && temIdsPlural) {
        return res.status(400).json({ 
          message: 'Formato ambíguo: envie apenas idPaciente ou idsPacientes, não ambos simultaneamente' 
        });
      }

      // Normalizar lista de IDs
      let idsNormalizados = [];
      if (temIdsPlural) {
        if (!Array.isArray(req.body.idsPacientes)) {
          return res.status(400).json({ message: 'idsPacientes deve ser uma lista de IDs' });
        }
        if (req.body.idsPacientes.length === 0) {
          return res.status(400).json({ message: 'Selecione ao menos um paciente' });
        }
        for (const item of req.body.idsPacientes) {
          const idValido = parsePositiveInt(item);
          if (!idValido) {
            return res.status(400).json({ message: 'Todos os IDs de pacientes devem ser números inteiros positivos válidos' });
          }
          idsNormalizados.push(idValido);
        }
      } else if (temIdSingular) {
        const idValido = parsePositiveInt(req.body.idPaciente);
        if (!idValido) {
          return res.status(400).json({ message: 'ID do paciente inválido' });
        }
        idsNormalizados = [idValido];
      } else {
        return res.status(400).json({ message: 'Paciente, atividade e profissional são obrigatórios' });
      }

      // Deduplicar IDs dentro da requisição
      const idsUnicos = [...new Set(idsNormalizados)];

      const idAtividade = parsePositiveInt(req.body.idAtividade);
      const idProfissional = parsePositiveInt(req.body.idProfissional);

      if (!idAtividade || !idProfissional) {
        return res.status(400).json({ message: 'Atividade e profissional são obrigatórios' });
      }

      // Iniciar transação atômica
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Validar Pacientes em consulta única no lote
        const [pacientes] = await conn.query(
          'SELECT id, nome, status, oculto FROM pacientes WHERE id IN (?)',
          [idsUnicos]
        );

        if (pacientes.length !== idsUnicos.length) {
          await conn.rollback();
          return res.status(400).json({ message: 'Um ou mais pacientes informados não existem no sistema' });
        }

        const pacienteInvalido = pacientes.find(p => p.status !== 'ativo' || p.oculto);
        if (pacienteInvalido) {
          await conn.rollback();
          return res.status(400).json({ message: `Paciente "${pacienteInvalido.nome}" está inativo ou arquivado` });
        }

        // 2. Validar Atividade
        const [atividades] = await conn.query(
          'SELECT aa.id, aa.nome AS atividade, aa.id_curso AS idCurso, c.nome AS curso FROM atividades_atendimento aa JOIN cursos c ON c.id = aa.id_curso WHERE aa.id = ? AND aa.ativo = TRUE', 
          [idAtividade]
        );

        if (!atividades.length) {
          await conn.rollback();
          return res.status(400).json({ message: 'Atividade não encontrada ou inativa' });
        }

        const atividade = atividades[0];

        // 3. Validar se Professor está restrito ao seu próprio curso (anti-IDOR)
        if (req.user.role === 'PROFESSOR') {
          if (Number(atividade.idCurso) !== Number(req.user.idCurso)) {
            await conn.rollback();
            return res.status(403).json({ message: 'A atividade não pertence ao curso do usuário' });
          }
        }

        // 4. Validar Profissional
        const [prof] = await conn.query(
          'SELECT id, nome, id_curso AS idCurso FROM usuarios WHERE id = ? AND papel = ? AND ativo = TRUE AND oculto = FALSE',
          [idProfissional, 'PROFESSOR']
        );

        if (!prof.length) {
          await conn.rollback();
          return res.status(400).json({ message: 'Profissional não encontrado ou inativo' });
        }

        const profissional = prof[0];

        // Validar consistência de curso
        if (Number(profissional.idCurso) !== Number(atividade.idCurso)) {
          await conn.rollback();
          if (req.user.role === 'PROFESSOR') {
            return res.status(403).json({ message: 'O profissional selecionado não pertence ao curso da atividade' });
          }
          return res.status(400).json({ message: 'O profissional selecionado deve pertencer ao mesmo curso da atividade' });
        }

        if (req.user.role === 'PROFESSOR' && Number(profissional.idCurso) !== Number(req.user.idCurso)) {
          await conn.rollback();
          return res.status(403).json({ message: 'O profissional selecionado não pertence ao seu curso' });
        }

        // 5. Regra obrigatória do calendário: semestre ativo + dia previsto + sem exceção.
        const validacaoCalendario = await validarDataRegistroFrequencia(conn, {
          id: idAtividade,
          idCurso: atividade.idCurso,
          atividade: atividade.atividade
        });
        if (!validacaoCalendario.valido) {
          await conn.rollback();
          return res.status(validacaoCalendario.statusHttp || 409).json({
            code: validacaoCalendario.codigo || 'CALENDARIO_INVALIDO',
            message: validacaoCalendario.mensagem
          });
        }

        // 6. Inserir em lote na tabela frequencia com timestamp compartilhado
        const agora = new Date();
        const observacaoTexto = req.body.observacao || req.body.observacoes || null;

        const linhasFrequencia = idsUnicos.map(idPac => [
          idPac,
          idProfissional,
          idAtividade,
          observacaoTexto,
          agora
        ]);

        const [resultadoInsert] = await conn.query(
          'INSERT INTO frequencia (id_paciente, id_profissional, id_atividade, observacoes, registrado_em) VALUES ?',
          [linhasFrequencia]
        );

        const totalRegistrados = idsUnicos.length;
        const idsGerados = [];
        for (let i = 0; i < totalRegistrados; i++) {
          idsGerados.push(resultadoInsert.insertId + i);
        }

        // 7. Inserir movimentações transacionais para cada paciente
        const mapaNomes = new Map(pacientes.map(p => [Number(p.id), p.nome]));
        for (const idPac of idsUnicos) {
          const nomePac = mapaNomes.get(idPac) || 'Paciente';
          await registrarMovimentacao({
            id_usuario: req.user.id,
            id_paciente: idPac,
            id_curso: atividade.idCurso,
            id_atividade: idAtividade,
            tipo: 'Frequência registrada',
            descricao: `${nomePac} participou de ${atividade.atividade}`
          }, conn);
        }

        await conn.commit();

        // 8. Resposta estruturada
        const resposta = {
          sucesso: true,
          totalRegistrados,
          ids: idsGerados,
          idAtividade,
          idProfissional,
          registradoEm: agora.toISOString(),
          observacao: observacaoTexto
        };

        if (temIdSingular) {
          resposta.id = idsGerados[0];
          resposta.idPaciente = idsUnicos[0];
          resposta.mensagem = 'Frequência registrada com sucesso';
        } else {
          resposta.mensagem = totalRegistrados === 1
            ? 'Frequência registrada com sucesso'
            : `${totalRegistrados} frequências registradas com sucesso`;
          if (totalRegistrados === 1) {
            resposta.id = idsGerados[0];
          }
        }

        res.status(201).json(resposta);
      } catch (transError) {
        await conn.rollback();
        throw transError;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Erro ao registrar frequência:', error);
      res.status(500).json({ message: 'Erro ao registrar frequência' });
    }
  }
};
