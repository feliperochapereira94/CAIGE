import pool from '../models/database.js';
import { registrarMovimentacao } from '../models/movimentacoesModel.js';
import { parsePositiveInt } from '../models/validacaoModel.js';

const NOME_SOMENTE_LETRAS = /^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u;
const nomeValido = (valor) => NOME_SOMENTE_LETRAS.test(String(valor || '').trim());

async function obterAtividadeComCurso(idAtividade) {
  const [atividades] = await pool.query(
    `
      SELECT aa.id, aa.id_curso AS idCurso, c.nome AS curso, aa.nome, aa.descricao,
             aa.ativo, aa.criado_em AS criadoEm, aa.atualizado_em AS atualizadoEm
      FROM atividades_atendimento aa
      JOIN cursos c ON c.id = aa.id_curso
      WHERE aa.id = ?
    `,
    [idAtividade]
  );

  return atividades[0] || null;
}

export async function listarAtividadesAtendimento(req, res) {
  try {
    const idCurso = req.query.idCurso ? parsePositiveInt(req.query.idCurso) : null;
    const parametros = [];
    let consulta = `
      SELECT aa.id, aa.id_curso AS idCurso, c.nome AS curso, aa.nome, aa.descricao,
             aa.ativo, aa.criado_em AS criadoEm, aa.atualizado_em AS atualizadoEm
      FROM atividades_atendimento aa
      JOIN cursos c ON c.id = aa.id_curso
      WHERE 1 = 1`;

    if (req.user?.role !== 'SUPERVISOR') {
      if (!req.user?.idCurso) {
        return res.status(403).json({ message: 'Usuário sem curso vinculado' });
      }

      if (idCurso && idCurso !== req.user.idCurso) {
        return res.status(403).json({ message: 'Você não pode acessar atividades de outro curso' });
      }

      consulta += ' AND aa.id_curso = ?';
      parametros.push(req.user.idCurso);
    }

    if (idCurso) {
      consulta += ' AND aa.id_curso = ?';
      parametros.push(idCurso);
    }

    consulta += ' ORDER BY c.nome, aa.nome';
    const [atividades] = await pool.query(consulta, parametros);
    res.json(atividades);
  } catch (error) {
    console.error('Erro ao listar atividades de atendimento:', error);
    res.status(500).json({ message: 'Erro ao listar atividades de atendimento' });
  }
}

export async function listarAtividadesPorCurso(req, res) {
  if (req.user?.role !== 'SUPERVISOR') {
    const idCurso = parsePositiveInt(req.params.idCurso);
    if (!idCurso || idCurso !== req.user?.idCurso) {
      return res.status(403).json({ message: 'Você não pode acessar atividades de outro curso' });
    }
  }

  req.query.idCurso = req.params.idCurso;
  return listarAtividadesAtendimento(req, res);
}

export async function obterAtividadeAtendimento(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID da atividade inválido' });

    const atividade = await obterAtividadeComCurso(id);
    if (!atividade) return res.status(404).json({ message: 'Atividade não encontrada' });

    if (req.user?.role !== 'SUPERVISOR') {
      if (!req.user?.idCurso || atividade.idCurso !== req.user.idCurso) {
        return res.status(403).json({ message: 'Você não pode acessar atividades de outro curso' });
      }
    }

    res.json(atividade);
  } catch (error) {
    console.error('Erro ao obter atividade de atendimento:', error);
    res.status(500).json({ message: 'Erro ao obter atividade de atendimento' });
  }
}

export async function criarAtividadeAtendimento(req, res) {
  try {
    const idCursoRecebido = parsePositiveInt(req.body.idCurso);
    const idCurso = req.user?.role === 'SUPERVISOR' ? idCursoRecebido : req.user?.idCurso;
    const nome = String(req.body.nome || '').trim();
    const descricao = req.body.descricao ? String(req.body.descricao).trim() : null;

    if (!idCurso || !nome) {
      return res.status(400).json({ message: 'Curso e nome da atividade são obrigatórios' });
    }
    if (!nomeValido(nome)) {
      return res.status(400).json({ message: 'O nome da atividade deve conter somente letras.' });
    }

    if (req.user?.role !== 'SUPERVISOR' && idCursoRecebido && idCursoRecebido !== req.user.idCurso) {
      return res.status(403).json({ message: 'Você não pode criar atividades em outro curso' });
    }

    const [cursos] = await pool.query('SELECT nome FROM cursos WHERE id = ? AND ativo = TRUE', [idCurso]);
    if (!cursos.length) return res.status(400).json({ message: 'Curso não encontrado ou inativo' });

    const [resultado] = await pool.query(
      'INSERT INTO atividades_atendimento (id_curso, nome, descricao, ativo) VALUES (?, ?, ?, TRUE)',
      [idCurso, nome, descricao]
    );

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      id_curso: idCurso,
      id_atividade: resultado.insertId,
      tipo: 'Atividade cadastrada',
      descricao: `${nome} cadastrada no curso ${cursos[0].nome}`
    });

    res.status(201).json({ id: resultado.insertId, idCurso, nome, descricao, ativo: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ja existe uma atividade com esse nome no curso' });
    console.error('Erro ao criar atividade de atendimento:', error);
    res.status(500).json({ message: 'Erro ao criar atividade de atendimento' });
  }
}

export async function atualizarAtividadeAtendimento(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    const nome = String(req.body.nome || '').trim();
    const descricao = req.body.descricao ? String(req.body.descricao).trim() : null;
    const ativo = req.body.ativo !== false && req.body.ativo !== 'false';
    if (!id || !nome) return res.status(400).json({ message: 'ID e nome da atividade são obrigatórios' });
    if (!nomeValido(nome)) return res.status(400).json({ message: 'O nome da atividade deve conter somente letras.' });

    const atividade = await obterAtividadeComCurso(id);
    if (!atividade) return res.status(404).json({ message: 'Atividade não encontrada' });

    if (req.user?.role !== 'SUPERVISOR') {
      if (!req.user?.idCurso || atividade.idCurso !== req.user.idCurso) {
        return res.status(403).json({ message: 'Você não pode alterar atividades de outro curso' });
      }
    }

    const [resultado] = await pool.query(
      'UPDATE atividades_atendimento SET nome = ?, descricao = ?, ativo = ? WHERE id = ?',
      [nome, descricao, ativo, id]
    );
    if (!resultado.affectedRows) return res.status(404).json({ message: 'Atividade não encontrada' });
    res.json({ message: 'Atividade atualizada com sucesso' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ja existe uma atividade com esse nome no curso' });
    console.error('Erro ao atualizar atividade de atendimento:', error);
    res.status(500).json({ message: 'Erro ao atualizar atividade de atendimento' });
  }
}


export async function excluirAtividadeAtendimento(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID da atividade inválido' });

    const atividade = await obterAtividadeComCurso(id);
    if (!atividade) return res.status(404).json({ message: 'Atividade não encontrada' });

    if (req.user?.role !== 'SUPERVISOR') {
      if (!req.user?.idCurso || atividade.idCurso !== req.user.idCurso) {
        return res.status(403).json({ message: 'Você não pode excluir atividades de outro curso' });
      }
    }

    const [[uso]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM frequencia WHERE id_atividade = ?) AS frequencias,
         (SELECT COUNT(*) FROM grade_periodo_letivo WHERE id_atividade = ?) AS calendarios`,
      [id, id]
    );

    if (Number(uso?.frequencias || 0) > 0 || Number(uso?.calendarios || 0) > 0) {
      return res.status(409).json({
        message: 'Esta atividade já possui frequência ou calendário vinculado e não pode ser excluída. Desative a atividade para preservar o histórico.'
      });
    }

    const conexao = await pool.getConnection();
    try {
      await conexao.beginTransaction();
      // A movimentação textual continua preservada para auditoria; apenas a FK
      // é liberada para permitir excluir uma atividade ainda sem uso operacional.
      await conexao.query('UPDATE movimentacoes SET id_atividade = NULL WHERE id_atividade = ?', [id]);
      await conexao.query('DELETE FROM atividades_atendimento WHERE id = ?', [id]);
      await conexao.commit();
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }

    res.json({ message: 'Atividade excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir atividade de atendimento:', error);
    res.status(500).json({ message: 'Erro ao excluir atividade de atendimento' });
  }
}
