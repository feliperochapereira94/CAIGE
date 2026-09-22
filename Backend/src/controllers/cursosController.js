import pool from '../models/database.js';
import { registrarMovimentacao } from '../models/movimentacoesModel.js';
import { parsePositiveInt } from '../models/validacaoModel.js';

const NOME_SOMENTE_LETRAS = /^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u;
const nomeValido = (valor) => NOME_SOMENTE_LETRAS.test(String(valor || '').trim());

// Listar cursos: supervisor vê todos; professor vê apenas o próprio curso vinculado
export async function listCourses(req, res) {
  try {
    const isProfessor = req.user?.role === 'PROFESSOR';
    const query = isProfessor
      ? 'SELECT id, nome, ativo, criado_em AS criadoEm FROM cursos WHERE id = ? AND ativo = TRUE ORDER BY nome ASC'
      : 'SELECT id, nome, ativo, criado_em AS criadoEm FROM cursos ORDER BY nome ASC';
    const params = isProfessor ? [req.user.idCurso] : [];

    const [courses] = await pool.query(query, params);
    res.json(courses);
  } catch (error) {
    console.error('Erro ao listar cursos:', error);
    res.status(500).json({ message: 'Erro ao listar cursos' });
  }
}

// Criar curso (apenas supervisor)
export async function createCourse(req, res) {
  try {
    const incomingName = req.body.nome ?? req.body.name;
    if (!incomingName || !String(incomingName).trim()) {
      return res.status(400).json({ message: 'Nome do curso e obrigatorio' });
    }

    const trimmedName = String(incomingName).trim();
    if (!nomeValido(trimmedName)) {
      return res.status(400).json({ message: 'O nome do curso deve conter somente letras.' });
    }
    const [result] = await pool.query(
      'INSERT INTO cursos (nome) VALUES (?)',
      [trimmedName]
    );

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      id_curso: result.insertId,
      tipo: 'Curso criado',
      descricao: `Curso "${trimmedName}" criado`
    });

    res.status(201).json({
      id: result.insertId,
      nome: trimmedName,
      ativo: true,
      criadoEm: null
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Ja existe um curso com esse nome' });
    }
    console.error('Erro ao criar curso:', error);
    res.status(500).json({ message: 'Erro ao criar curso' });
  }
}

// Atualizar curso (apenas supervisor)
export async function updateCourse(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    const incomingName = req.body.nome ?? req.body.name;
    const incomingActive = req.body.ativo ?? req.body.is_active;

    if (!id) {
      return res.status(400).json({ message: 'ID do curso inválido' });
    }

    if (!incomingName || !String(incomingName).trim()) {
      return res.status(400).json({ message: 'Nome do curso e obrigatorio' });
    }

    const trimmedName = String(incomingName).trim();
    if (!nomeValido(trimmedName)) {
      return res.status(400).json({ message: 'O nome do curso deve conter somente letras.' });
    }
    const active = incomingActive !== false && incomingActive !== 'false';

    const [result] = await pool.query(
      'UPDATE cursos SET nome = ?, ativo = ? WHERE id = ?',
      [trimmedName, active, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    res.json({
      id,
      nome: trimmedName,
      ativo: active,
      message: 'Curso atualizado com sucesso'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Ja existe um curso com esse nome' });
    }
    console.error('Erro ao atualizar curso:', error);
    res.status(500).json({ message: 'Erro ao atualizar curso' });
  }
}

// Remover curso (apenas supervisor, somente se não houver usuários vinculados)
export async function deleteCourse(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'ID do curso inválido' });
    }

    const [course] = await pool.query('SELECT nome FROM cursos WHERE id = ?', [id]);
    if (course.length === 0) {
      return res.status(404).json({ message: 'Curso não encontrado' });
    }

    const courseName = course[0].nome;

    // Bloquear exclusão se houver usuários vinculados a este curso
    const [users] = await pool.query(
      'SELECT COUNT(*) AS total FROM usuarios WHERE id_curso = ?',
      [id]
    );
    if (users[0].total > 0) {
      return res.status(400).json({
        message: `Não é possível excluir: ${users[0].total} usuário(s) vinculado(s) a este curso`
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.query('DELETE FROM cursos WHERE id = ?', [id]);
    } finally {
      conn.release();
    }

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      tipo: 'Curso removido',
      descricao: `Curso removido: ${courseName}`
    });

    res.json({ message: 'Curso removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover curso:', error);
    res.status(500).json({ message: 'Erro ao remover curso' });
  }
}
