import pool from '../models/database.js';
import { registrarMovimentacao } from '../models/movimentacoesModel.js';
import { getPatientSchema } from '../models/esquemaModel.js';
import { normalizeIdArray, parsePositiveInt } from '../models/validacaoModel.js';
import { aplicarSnapshotHistorico, criarDadosResposta, criarSnapshotProntuario } from '../models/snapshotProntuarioModel.js';

function isSameCourse(firstCourseId, secondCourseId) {
  const first = Number(firstCourseId);
  const second = Number(secondCourseId);

  return Number.isInteger(first) && first > 0
    && Number.isInteger(second) && second > 0
    && first === second;
}

async function canManageCourse(userRole, userCourseId, courseId) {
  if (userRole === 'SUPERVISOR') {
    return true;
  }
  
  if (!userCourseId || !courseId) {
    return false;
  }
  
  // Para professor, verificar se o curso vinculado corresponde ao curso solicitado
  return isSameCourse(userCourseId, courseId);
}

function getAuthenticatedUser(req) {
  return {
    id: req.user?.id || null,
    name: req.user?.name || null,
    email: req.user?.email || null,
    role: req.user?.role || null,
    course_id: req.user?.idCurso || null
  };
}

function isProfessorWithoutCourse(user) {
  return user.role === 'PROFESSOR' && !user.course_id;
}

function assertProfessorCourseScope(user, courseId, message) {
  if (user.role !== 'PROFESSOR') {
    return null;
  }

  if (!user.course_id || !isSameCourse(user.course_id, courseId)) {
    return { message: message };
  }

  return null;
}

function canRegisterClinicalRecord(user, courseId) {
  if (user.role === 'SUPERVISOR') {
    return Boolean(courseId);
  }

  return Boolean(
    user.course_id &&
    courseId &&
    isSameCourse(user.course_id, courseId)
  );
}

function canReadQuestionnaireDefinition(user, questionnaire) {
  if (!questionnaire) {
    return false;
  }

  if (user.role === 'SUPERVISOR') {
    return true;
  }

  return Boolean(
    user.course_id &&
    isSameCourse(user.course_id, questionnaire.id_curso)
  );
}

async function getQuestionnaireCourse(questionnaireId) {
  const [questionnaires] = await pool.query(
    `SELECT q.id,
            q.titulo,
            q.descricao,
            q.id_curso,
            q.criado_por,
            q.publicado,
            c.nome AS course_name
     FROM questionarios q
     LEFT JOIN cursos c ON c.id = q.id_curso
     WHERE q.id = ?`,
    [questionnaireId]
  );

  return questionnaires[0] || null;
}

async function canUseQuestionsInCourse(questionIds, courseId) {
  if (!questionIds.length) {
    return true;
  }

  const placeholders = questionIds.map(() => '?').join(',');
  const [questions] = await pool.query(
    `SELECT DISTINCT id_pergunta AS idPergunta
     FROM perguntas_cursos
     WHERE ativo = TRUE
       AND id_curso = ?
       AND id_pergunta IN (${placeholders})`,
    [courseId, ...questionIds]
  );

  return questions.length === new Set(questionIds).size;
}

async function getTotalActiveCourses() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM cursos WHERE ativo = TRUE');
  return Number(rows[0]?.total || 0);
}

async function getAllActiveCourseIds() {
  const [rows] = await pool.query('SELECT id FROM cursos WHERE ativo = TRUE');
  return rows.map((row) => row.id);
}

// ==================== PERGUNTAS ====================

export const getQuestionsByCourse = async (req, res) => {
  try {
    const idCurso = parsePositiveInt(req.params.idCurso);

    if (!idCurso) {
      return res.status(400).json({ message: 'ID de curso inválido' });
    }

    if (req.user?.role === 'PROFESSOR' && Number(req.user.idCurso) !== Number(idCurso)) {
      return res.status(403).json({ message: 'Você só pode visualizar perguntas do seu próprio curso' });
    }

    const totalCursosAtivos = await getTotalActiveCourses();

    const [perguntas] = await pool.query(
      `SELECT p.id,
              p.titulo AS title,
              p.descricao AS description,
              p.tipo_pergunta AS question_type,
              p.opcoes AS options,
              p.criado_por AS created_by,
              p.id_curso AS origin_course_id,
              p.criado_em AS created_at,
              COUNT(DISTINCT pc.id_curso) AS totalCursosAssociados,
              GROUP_CONCAT(DISTINCT pc.id_curso ORDER BY pc.id_curso) AS idsCursos,
              GROUP_CONCAT(DISTINCT c.nome ORDER BY c.nome SEPARATOR ' • ') AS cursos
       FROM perguntas p
       JOIN perguntas_cursos pc
         ON pc.id_pergunta = p.id
        AND pc.ativo = TRUE
       JOIN cursos c
         ON c.id = pc.id_curso
       WHERE p.ativo = TRUE
         AND EXISTS (
           SELECT 1
           FROM perguntas_cursos pc_filtro
           WHERE pc_filtro.id_pergunta = p.id
             AND pc_filtro.id_curso = ?
             AND pc_filtro.ativo = TRUE
         )
       GROUP BY p.id, p.titulo, p.descricao, p.tipo_pergunta, p.opcoes, p.criado_por, p.id_curso, p.criado_em
       ORDER BY p.criado_em DESC`,
      [idCurso]
    );

    const resultado = perguntas.map((p) => {
      const isTodosCursos = Number(p.totalCursosAssociados) >= totalCursosAtivos && totalCursosAtivos > 0;
      let cursosExibicao = p.cursos;
      let idsCursosExibicao = p.idsCursos;

      if (req.user?.role === 'PROFESSOR') {
        if (isTodosCursos) {
          cursosExibicao = 'Todos os cursos';
          idsCursosExibicao = '';
        } else {
          cursosExibicao = p.cursos
            ? p.cursos.split(' • ').find(Boolean) || ''
            : '';
          idsCursosExibicao = String(req.user.idCurso);
        }
      }

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        question_type: p.question_type,
        options: p.options,
        created_by: p.created_by,
        id_curso: p.origin_course_id,
        created_at: p.created_at,
        idsCursos: idsCursosExibicao,
        cursos: cursosExibicao,
        todosCursos: isTodosCursos
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao listar perguntas:', error);
    res.status(500).json({ message: 'Erro ao listar perguntas' });
  }
};

export const getAllQuestions = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (isProfessorWithoutCourse(user)) {
      return res.status(403).json({ message: 'Usuário sem curso vinculado' });
    }

    const filtroCurso = parsePositiveInt(req.query.idCurso);

    if (
      user.role === 'PROFESSOR' &&
      filtroCurso &&
      Number(filtroCurso) !== Number(user.course_id)
    ) {
      return res.status(403).json({ message: 'Você só pode visualizar perguntas do seu próprio curso' });
    }

    const idCurso = user.role === 'PROFESSOR'
      ? user.course_id
      : filtroCurso;

    const totalCursosAtivos = await getTotalActiveCourses();

    const parametros = [];
    let filtro = '';

    if (idCurso) {
      filtro = `AND EXISTS (
        SELECT 1
        FROM perguntas_cursos pc_filtro
        WHERE pc_filtro.id_pergunta = p.id
          AND pc_filtro.id_curso = ?
          AND pc_filtro.ativo = TRUE
      )`;
      parametros.push(idCurso);
    }

    const [perguntas] = await pool.query(
      `SELECT p.id,
              p.titulo AS title,
              p.descricao AS description,
              p.tipo_pergunta AS question_type,
              p.opcoes AS options,
              p.criado_por AS created_by,
              p.id_curso AS origin_course_id,
              p.criado_em AS created_at,
              COUNT(DISTINCT pc.id_curso) AS totalCursosAssociados,
              GROUP_CONCAT(DISTINCT pc.id_curso ORDER BY pc.id_curso) AS idsCursos,
              GROUP_CONCAT(DISTINCT c.nome ORDER BY c.nome SEPARATOR ' • ') AS cursos
       FROM perguntas p
       JOIN perguntas_cursos pc
         ON pc.id_pergunta = p.id
        AND pc.ativo = TRUE
       JOIN cursos c
         ON c.id = pc.id_curso
       WHERE p.ativo = TRUE
         ${filtro}
       GROUP BY p.id, p.titulo, p.descricao, p.tipo_pergunta, p.opcoes, p.criado_por, p.id_curso, p.criado_em
       ORDER BY p.criado_em DESC`,
      parametros
    );

    const resultado = perguntas.map((p) => {
      const isTodosCursos = Number(p.totalCursosAssociados) >= totalCursosAtivos && totalCursosAtivos > 0;
      let cursosExibicao = p.cursos;
      let idsCursosExibicao = p.idsCursos;

      if (user.role === 'PROFESSOR') {
        if (isTodosCursos) {
          cursosExibicao = 'Todos os cursos';
          idsCursosExibicao = '';
        } else {
          cursosExibicao = p.cursos
            ? p.cursos.split(' • ').find(Boolean) || ''
            : '';
          idsCursosExibicao = String(user.course_id);
        }
      }

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        question_type: p.question_type,
        options: p.options,
        created_by: p.created_by,
        id_curso: p.origin_course_id,
        created_at: p.created_at,
        idsCursos: idsCursosExibicao,
        cursos: cursosExibicao,
        todosCursos: isTodosCursos
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao listar todas as perguntas:', error);
    res.status(500).json({ message: 'Erro ao listar perguntas' });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const title = req.body.title || req.body.titulo;
    const description = req.body.description || req.body.descricao || null;
    const questionType = req.body.question_type || req.body.tipo_pergunta;
    const options = req.body.options || req.body.opcoes;
    const idsCursos = normalizeIdArray(req.body.idsCursos || req.body.ids_cursos);
    const idCurso = parsePositiveInt(req.body.idCurso || req.body.course_id || req.body.courseId);
    const todosCursos = req.body.todosCursos === true || req.body.todos_cursos === true;

    if (!user.id) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    let cursosDaPergunta = [];
    let originCourseId = null;

    if (user.role === 'PROFESSOR') {
      if (!user.course_id) {
        return res.status(403).json({ message: 'Usuário sem curso vinculado' });
      }

      originCourseId = user.course_id;

      if (todosCursos) {
        cursosDaPergunta = await getAllActiveCourseIds();
      } else {
        if (idsCursos.length > 0 && idsCursos.some((cursoId) => Number(cursoId) !== Number(user.course_id))) {
          return res.status(403).json({ message: 'Você só pode criar perguntas no seu próprio curso' });
        }
        cursosDaPergunta = [user.course_id];
      }
    } else if (user.role === 'SUPERVISOR') {
      if (todosCursos) {
        cursosDaPergunta = await getAllActiveCourseIds();
        originCourseId = cursosDaPergunta[0] || 1;
      } else {
        cursosDaPergunta = idsCursos.length ? idsCursos : (idCurso ? [idCurso] : []);
        originCourseId = cursosDaPergunta[0] || null;
      }
    } else {
      return res.status(403).json({ message: 'Sem permissão para criar perguntas' });
    }

    if (!title || !questionType || cursosDaPergunta.length === 0) {
      return res.status(400).json({ message: 'Título, tipo_pergunta e pelo menos um curso são obrigatórios' });
    }

    if (!['texto_livre', 'multipla_escolha', 'sim_nao', 'escala'].includes(questionType)) {
      return res.status(400).json({ message: 'Tipo de pergunta inválido' });
    }

    if (questionType === 'multipla_escolha' && (!options || !Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ message: 'Múltipla escolha requer pelo menos 2 opções' });
    }

    if (user.role === 'SUPERVISOR' && !todosCursos) {
      const placeholders = cursosDaPergunta.map(() => '?').join(',');
      const [cursosValidos] = await pool.query(`SELECT id FROM cursos WHERE ativo = TRUE AND id IN (${placeholders})`, cursosDaPergunta);
      if (cursosValidos.length !== new Set(cursosDaPergunta).size) {
        return res.status(400).json({ message: 'Um ou mais cursos informados não existem ou estão inativos' });
      }
    }

    const optionsJson = questionType === 'multipla_escolha' ? JSON.stringify({ options }) : null;

    const [result] = await pool.query(
      'INSERT INTO perguntas (titulo, descricao, tipo_pergunta, opcoes, criado_por, id_curso) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, questionType, optionsJson, user.id, originCourseId]
    );

    for (const cursoId of cursosDaPergunta) {
      await pool.query(
        'INSERT INTO perguntas_cursos (id_pergunta, id_curso, ativo) VALUES (?, ?, TRUE) ON DUPLICATE KEY UPDATE ativo = TRUE',
        [result.insertId, cursoId]
      );
    }

    await registrarMovimentacao({
      id_usuario: user.id,
      id_curso: originCourseId,
      tipo: 'Pergunta criada',
      descricao: `Pergunta criada: ${title}`
    });

    res.status(201).json({
      id: result.insertId,
      title,
      description,
      question_type: questionType,
      options: questionType === 'multipla_escolha' ? options : null,
      idCurso: originCourseId,
      idsCursos: user.role === 'PROFESSOR' && !todosCursos ? [user.course_id] : cursosDaPergunta,
      todosCursos
    });
  } catch (error) {
    console.error('Erro ao criar pergunta:', error);
    res.status(500).json({ message: 'Erro ao criar pergunta' });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const id = parsePositiveInt(req.params.id);
    const title = req.body.title || req.body.titulo;
    const description = req.body.description !== undefined ? (req.body.description || req.body.descricao || null) : undefined;
    const options = req.body.options || req.body.opcoes;
    const idsCursos = normalizeIdArray(req.body.idsCursos || req.body.ids_cursos);
    const todosCursos = req.body.todosCursos !== undefined ? Boolean(req.body.todosCursos) : (req.body.todos_cursos !== undefined ? Boolean(req.body.todos_cursos) : undefined);

    if (!id) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (!user.id) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const [perguntas] = await pool.query(
      'SELECT id, titulo, descricao, tipo_pergunta, opcoes, criado_por, id_curso FROM perguntas WHERE id = ? AND ativo = TRUE',
      [id]
    );

    if (!perguntas.length) {
      return res.status(404).json({ message: 'Pergunta não encontrada' });
    }

    const pergunta = perguntas[0];

    if (user.role === 'PROFESSOR') {
      if (Number(pergunta.criado_por) !== Number(user.id)) {
        return res.status(403).json({ message: 'Sem permissão para editar esta pergunta' });
      }

      if (Number(pergunta.id_curso) !== Number(user.course_id)) {
        return res.status(403).json({ message: 'Você só pode editar perguntas do seu próprio curso' });
      }

      if (idsCursos.length > 0 && idsCursos.some((cursoId) => Number(cursoId) !== Number(user.course_id)) && todosCursos !== true) {
        return res.status(403).json({ message: 'Você só pode editar perguntas do seu próprio curso' });
      }
    } else if (user.role !== 'SUPERVISOR') {
      return res.status(403).json({ message: 'Sem permissão para editar esta pergunta' });
    }

    let novosCursos = null;

    if (user.role === 'PROFESSOR') {
      if (todosCursos === true) {
        novosCursos = await getAllActiveCourseIds();
      } else if (todosCursos === false) {
        novosCursos = [user.course_id];
      }
    } else if (user.role === 'SUPERVISOR') {
      if (todosCursos === true) {
        novosCursos = await getAllActiveCourseIds();
      } else if (idsCursos.length > 0) {
        const placeholders = idsCursos.map(() => '?').join(',');
        const [cursosValidos] = await pool.query(`SELECT id FROM cursos WHERE ativo = TRUE AND id IN (${placeholders})`, idsCursos);
        if (cursosValidos.length !== new Set(idsCursos).size) {
          return res.status(400).json({ message: 'Um ou mais cursos informados não existem ou estão inativos' });
        }
        novosCursos = idsCursos;
      }
    }

    if (novosCursos && novosCursos.length > 0) {
      for (const cursoId of novosCursos) {
        await pool.query(
          'INSERT INTO perguntas_cursos (id_pergunta, id_curso, ativo) VALUES (?, ?, TRUE) ON DUPLICATE KEY UPDATE ativo = TRUE',
          [id, cursoId]
        );
      }
      const placeholders = novosCursos.map(() => '?').join(',');
      await pool.query(
        `UPDATE perguntas_cursos SET ativo = FALSE WHERE id_pergunta = ? AND id_curso NOT IN (${placeholders})`,
        [id, ...novosCursos]
      );
    }

    let updateOptions = null;
    if (pergunta.tipo_pergunta === 'multipla_escolha') {
      if (options) {
        if (!Array.isArray(options) || options.length < 2) {
          return res.status(400).json({ message: 'Múltipla escolha requer pelo menos 2 opções' });
        }
        updateOptions = JSON.stringify({ options });
      } else if (pergunta.opcoes) {
        updateOptions = typeof pergunta.opcoes === 'string' ? pergunta.opcoes : JSON.stringify(pergunta.opcoes);
      }
    }

    const finalTitle = title !== undefined ? title : pergunta.titulo;
    const finalDesc = description !== undefined ? description : pergunta.descricao;

    await pool.query(
      'UPDATE perguntas SET titulo = ?, descricao = ?, opcoes = ? WHERE id = ?',
      [finalTitle, finalDesc, updateOptions, id]
    );

    await registrarMovimentacao({
      id_usuario: user.id,
      id_curso: pergunta.id_curso,
      tipo: 'Pergunta atualizada',
      descricao: `Pergunta atualizada: ${finalTitle}`
    });

    res.json({ message: 'Pergunta atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar pergunta:', error);
    res.status(500).json({ message: 'Erro ao atualizar pergunta' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (!user.id) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const [perguntas] = await pool.query(
      'SELECT id, titulo, criado_por, id_curso FROM perguntas WHERE id = ? AND ativo = TRUE',
      [id]
    );

    if (!perguntas.length) {
      return res.status(404).json({ message: 'Pergunta não encontrada' });
    }

    const pergunta = perguntas[0];

    if (user.role === 'PROFESSOR') {
      if (Number(pergunta.criado_por) !== Number(user.id)) {
        return res.status(403).json({ message: 'Sem permissão para excluir esta pergunta' });
      }

      if (Number(pergunta.id_curso) !== Number(user.course_id)) {
        return res.status(403).json({ message: 'Você só pode excluir perguntas do seu próprio curso' });
      }
    } else if (user.role !== 'SUPERVISOR') {
      return res.status(403).json({ message: 'Sem permissão para excluir esta pergunta' });
    }

    await pool.query('UPDATE perguntas SET ativo = FALSE WHERE id = ?', [id]);
    await pool.query('UPDATE perguntas_cursos SET ativo = FALSE WHERE id_pergunta = ?', [id]);

    await registrarMovimentacao({
      id_usuario: user.id,
      id_curso: pergunta.id_curso,
      tipo: 'Pergunta removida',
      descricao: `Pergunta removida: ${pergunta.titulo}`
    });

    res.json({ message: 'Pergunta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir pergunta:', error);
    res.status(500).json({ message: 'Erro ao excluir pergunta' });
  }
};

function normalizarDisposicaoPergunta(valor) {
  const disposicao = String(valor || 'automatico').trim().toLowerCase();
  return ['automatico', 'linha_inteira', 'lado_a_lado'].includes(disposicao)
    ? disposicao
    : 'automatico';
}

function normalizarQuestoesQuestionario(values) {
  if (!Array.isArray(values)) return [];

  return values.map((value, index) => {
    const id = parsePositiveInt(typeof value === 'object' ? value.id : value);
    if (!id) return null;
    return {
      id,
      ordem: index + 1,
      disposicao: normalizarDisposicaoPergunta(
        typeof value === 'object' ? (value.disposicao || value.layout) : 'automatico'
      )
    };
  }).filter(Boolean);
}

// ==================== QUESTIONARIOS ====================

export const getQuestionnaires = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (isProfessorWithoutCourse(user)) {
      return res.status(403).json({ message: 'Usuário sem curso vinculado' });
    }

    const filtroCurso = parsePositiveInt(req.query.idCurso);

    if (
      user.role === 'PROFESSOR' &&
      filtroCurso &&
      Number(filtroCurso) !== Number(user.course_id)
    ) {
      return res.status(403).json({ message: 'Você só pode visualizar questionários do seu próprio curso' });
    }

    const idCurso = user.role === 'PROFESSOR'
      ? user.course_id
      : filtroCurso;

    const parametros = [];
    const filtro = idCurso ? 'WHERE q.id_curso = ?' : '';

    if (idCurso) {
      parametros.push(idCurso);
    }

    const [questionarios] = await pool.query(
      `SELECT q.id,
              q.titulo AS title,
              q.descricao AS description,
              q.id_curso AS idCurso,
              c.nome AS course_name,
              q.criado_por AS created_by,
              u.nome AS creator_name,
              q.publicado AS is_published,
              COUNT(qq.id) AS question_count,
              q.criado_em AS created_at
       FROM questionarios q
       JOIN cursos c ON c.id = q.id_curso
       LEFT JOIN usuarios u ON u.id = q.criado_por
       LEFT JOIN questoes_questionarios qq
         ON q.id = qq.id_questionario
        AND qq.ativo = TRUE
       ${filtro}
       GROUP BY q.id, q.titulo, q.descricao, q.id_curso, c.nome, q.criado_por, u.nome, q.publicado, q.criado_em
       ORDER BY c.nome ASC, q.publicado DESC, q.criado_em DESC`,
      parametros
    );

    res.json(questionarios);
  } catch (error) {
    console.error('Erro ao listar questionários:', error);
    res.status(500).json({ message: 'Erro ao listar questionários' });
  }
};

export const getPublishedQuestionnaires = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (isProfessorWithoutCourse(user)) {
      return res.status(403).json({ message: 'Usuário sem curso vinculado' });
    }

    const filtroSolicitado = parsePositiveInt(req.query.idCurso);

    if (
      user.role === 'PROFESSOR' &&
      filtroSolicitado &&
      Number(filtroSolicitado) !== Number(user.course_id)
    ) {
      return res.status(403).json({ message: 'Você só pode visualizar prontuários publicados do seu próprio curso' });
    }

    const idCurso = user.role === 'PROFESSOR'
      ? user.course_id
      : filtroSolicitado;

    const parametros = [];
    let filtroCurso = '';

    if (idCurso) {
      filtroCurso = 'AND q.id_curso = ?';
      parametros.push(idCurso);
    }

    const [questionarios] = await pool.query(
      `SELECT q.id,
              q.titulo AS title,
              q.descricao AS description,
              q.id_curso AS idCurso,
              c.nome AS course_name,
              q.criado_por AS created_by,
              q.publicado AS is_published,
              COUNT(qq.id) AS question_count,
              q.criado_em AS created_at
       FROM questionarios q
       JOIN cursos c ON c.id = q.id_curso
       LEFT JOIN questoes_questionarios qq
         ON q.id = qq.id_questionario
        AND qq.ativo = TRUE
       WHERE q.publicado = TRUE
         ${filtroCurso}
       GROUP BY q.id, q.titulo, q.descricao, q.id_curso, c.nome, q.criado_por, q.publicado, q.criado_em
       ORDER BY c.nome ASC, q.criado_em DESC`,
      parametros
    );

    res.json(questionarios);
  } catch (error) {
    console.error('Erro ao listar questionários publicados:', error);
    res.status(500).json({ message: 'Erro ao listar questionários publicados' });
  }
};

export const getQuestionnairesByCourse = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const idCurso = parsePositiveInt(req.params.idCurso);

    if (!idCurso) {
      return res.status(400).json({ message: 'ID de curso inválido' });
    }

    const erroEscopo = assertProfessorCourseScope(
      user,
      idCurso,
      'Você só pode visualizar questionários do seu próprio curso'
    );

    if (erroEscopo) {
      return res.status(403).json(erroEscopo);
    }

    const [questionarios] = await pool.query(
      `SELECT q.id,
              q.titulo AS title,
              q.descricao AS description,
              q.id_curso AS idCurso,
              c.nome AS course_name,
              q.criado_por AS created_by,
              q.publicado AS is_published,
              COUNT(qq.id) AS question_count,
              q.criado_em AS created_at
       FROM questionarios q
       JOIN cursos c ON c.id = q.id_curso
       LEFT JOIN questoes_questionarios qq
         ON q.id = qq.id_questionario
        AND qq.ativo = TRUE
       WHERE q.id_curso = ?
       GROUP BY q.id, q.titulo, q.descricao, q.id_curso, c.nome, q.criado_por, q.publicado, q.criado_em
       ORDER BY q.publicado DESC, q.criado_em DESC`,
      [idCurso]
    );

    res.json(questionarios);
  } catch (error) {
    console.error('Erro ao listar questionários:', error);
    res.status(500).json({ message: 'Erro ao listar questionários' });
  }
};

export const createQuestionnaire = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const title = req.body.title || req.body.titulo;
    const description = req.body.description || req.body.descricao || null;
    let idCurso = parsePositiveInt(req.body.idCurso || req.body.course_id || req.body.courseId);
    const questions = req.body.questions || req.body.perguntas;
    const questionItems = normalizarQuestoesQuestionario(questions);
    const questionIds = questionItems.map((item) => item.id);

    if (!user.id) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    if (user.role === 'PROFESSOR') {
      if (!user.course_id) {
        return res.status(403).json({ message: 'Usuário sem curso vinculado' });
      }

      if (idCurso && !isSameCourse(idCurso, user.course_id)) {
        return res.status(403).json({ message: 'Você só pode criar questionários no seu próprio curso' });
      }

      idCurso = user.course_id;
    }

    if (!title || !idCurso) {
      return res.status(400).json({ message: 'Título e idCurso são obrigatórios' });
    }

    if (!await canManageCourse(user.role, user.course_id, idCurso)) {
      return res.status(403).json({ message: 'Você só pode criar questionários no seu próprio curso' });
    }

    if (!await canUseQuestionsInCourse(questionIds, idCurso)) {
      return res.status(400).json({
        message: 'Uma ou mais perguntas não estão vinculadas ao curso do prontuário'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO questionarios (titulo, descricao, id_curso, criado_por) VALUES (?, ?, ?, ?)',
      [title, description, idCurso, user.id]
    );

    const questionnaireId = result.insertId;

    for (const item of questionItems) {
      await pool.query(
        `INSERT INTO questoes_questionarios
         (id_questionario, id_pergunta, ordem_pergunta, disposicao, ativo)
         VALUES (?, ?, ?, ?, TRUE)`,
        [questionnaireId, item.id, item.ordem, item.disposicao]
      );
    }

    await registrarMovimentacao({
      id_usuario: user.id,
      id_curso: idCurso,
      tipo: 'Questionário criado',
      descricao: `Questionário criado: ${title}`
    });

    res.status(201).json({
      id: questionnaireId,
      title,
      description,
      idCurso,
      question_count: questionIds.length
    });
  } catch (error) {
    console.error('Erro ao criar questionário:', error);
    res.status(500).json({ message: 'Erro ao criar questionário' });
  }
};

export const updateQuestionnaire = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const id = parsePositiveInt(req.params.id);
    const title = req.body.title || req.body.titulo;
    const description = req.body.description || req.body.descricao || null;
    const questions = req.body.questions || req.body.perguntas;
    const questionItems = normalizarQuestoesQuestionario(questions);
    const questionIds = questionItems.map((item) => item.id);

    if (!id) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (!user.id) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const questionario = await getQuestionnaireCourse(id);

    if (!questionario) {
      return res.status(404).json({ message: 'Questionário não encontrado' });
    }

    const erroEscopo = assertProfessorCourseScope(
      user,
      questionario.id_curso,
      'Você só pode editar questionários do seu próprio curso'
    );

    if (erroEscopo) {
      return res.status(403).json(erroEscopo);
    }

    const canEdit = questionario.criado_por === user.id
      || await canManageCourse(user.role, user.course_id, questionario.id_curso);

    if (!canEdit) {
      return res.status(403).json({ message: 'Sem permissão para editar este questionário' });
    }

    if (!await canUseQuestionsInCourse(questionIds, questionario.id_curso)) {
      return res.status(400).json({
        message: 'Uma ou mais perguntas não estão vinculadas ao curso do prontuário'
      });
    }

    await pool.query(
      'UPDATE questionarios SET titulo = ?, descricao = ? WHERE id = ?',
      [title, description, id]
    );

    if (Array.isArray(questions)) {
      if (questionIds.length > 0) {
        const placeholders = questionIds.map(() => '?').join(',');
        await pool.query(
          `UPDATE questoes_questionarios
           SET ativo = FALSE
           WHERE id_questionario = ?
             AND id_pergunta NOT IN (${placeholders})`,
          [id, ...questionIds]
        );
      } else {
        await pool.query(
          `UPDATE questoes_questionarios
           SET ativo = FALSE
           WHERE id_questionario = ?`,
          [id]
        );
      }

      for (const item of questionItems) {
        await pool.query(
          `INSERT INTO questoes_questionarios
           (id_questionario, id_pergunta, ordem_pergunta, disposicao)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             ordem_pergunta = VALUES(ordem_pergunta),
             disposicao = VALUES(disposicao),
             ativo = TRUE`,
          [id, item.id, item.ordem, item.disposicao]
        );
      }
    }

    await registrarMovimentacao({
      id_usuario: user.id,
      id_curso: questionario.id_curso,
      tipo: 'Questionário atualizado',
      descricao: `Questionário atualizado: ${title || questionario.titulo}`
    });

    res.json({ message: 'Questionário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar questionário:', error);
    res.status(500).json({ message: 'Erro ao atualizar questionário' });
  }
};

export const publishQuestionnaire = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (!user.id) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const questionario = await getQuestionnaireCourse(id);

    if (!questionario) {
      return res.status(404).json({ message: 'Questionário não encontrado' });
    }

    if (user.role !== 'SUPERVISOR' && questionario.criado_por !== user.id) {
      return res.status(403).json({ message: 'Sem permissão para publicar este questionário' });
    }

    const erroEscopo = assertProfessorCourseScope(
      user,
      questionario.id_curso,
      'Você só pode publicar questionários do seu próprio curso'
    );

    if (erroEscopo) {
      return res.status(403).json(erroEscopo);
    }

    const [perguntas] = await pool.query(
      'SELECT COUNT(*) as count FROM questoes_questionarios WHERE id_questionario = ? AND ativo = TRUE',
      [id]
    );

    if (perguntas[0].count === 0) {
      return res.status(400).json({ message: 'Questionário deve ter pelo menos 1 pergunta' });
    }

    await pool.query('UPDATE questionarios SET publicado = TRUE WHERE id = ?', [id]);

    await registrarMovimentacao({
      id_usuario: user.id,
      id_curso: questionario.id_curso,
      tipo: 'Questionário publicado',
      descricao: `Questionário publicado: ${questionario.titulo}`
    });

    res.json({ message: 'Questionário publicado com sucesso' });
  } catch (error) {
    console.error('Erro ao publicar questionário:', error);
    res.status(500).json({ message: 'Erro ao publicar questionário' });
  }
};

export const deleteQuestionnaire = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (!user.id) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    const questionario = await getQuestionnaireCourse(id);

    if (!questionario) {
      return res.status(404).json({ message: 'Questionário não encontrado' });
    }

    if (user.role !== 'SUPERVISOR' && questionario.criado_por !== user.id) {
      return res.status(403).json({ message: 'Sem permissão para excluir este questionário' });
    }

    const erroEscopo = assertProfessorCourseScope(
      user,
      questionario.id_curso,
      'Você só pode excluir questionários do seu próprio curso'
    );

    if (erroEscopo) {
      return res.status(403).json(erroEscopo);
    }

    const [respostas] = await pool.query(
      'SELECT COUNT(*) as total FROM respostas_questionarios WHERE id_questionario = ?',
      [id]
    );

    if ((respostas[0]?.total || 0) > 0) {
      return res.status(400).json({
        message: 'Este questionário já possui respostas salvas e não pode ser excluído'
      });
    }

    await pool.query('DELETE FROM questionarios WHERE id = ?', [id]);

    await registrarMovimentacao({
      id_usuario: user.id,
      id_curso: questionario.id_curso,
      tipo: 'Questionário removido',
      descricao: `Questionário removido: ${questionario.titulo}`
    });

    res.json({ message: 'Questionário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir questionário:', error);
    res.status(500).json({ message: 'Erro ao excluir questionário' });
  }
};

// ==================== RESPOSTAS ====================

export const getQuestionnaireQuestions = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const questionario = await getQuestionnaireCourse(id);

    if (!questionario) {
      return res.status(404).json({ message: 'Questionário não encontrado' });
    }

    if (!canReadQuestionnaireDefinition(user, questionario)) {
      return res.status(403).json({ message: 'Sem permissão para visualizar este questionário' });
    }

    const [perguntas] = await pool.query(
      `SELECT p.id,
              p.titulo AS title,
              p.descricao AS description,
              p.tipo_pergunta AS question_type,
              p.opcoes AS options,
              qq.ordem_pergunta AS question_order,
              qq.disposicao AS layout
       FROM perguntas p
       JOIN questoes_questionarios qq ON p.id = qq.id_pergunta
       WHERE qq.id_questionario = ?
         AND qq.ativo = TRUE
       ORDER BY qq.ordem_pergunta ASC`,
      [id]
    );

    res.json(perguntas);
  } catch (error) {
    console.error('Erro ao obter perguntas do questionário:', error);
    res.status(500).json({ message: 'Erro ao obter perguntas' });
  }
};

export const saveQuestionnaireResponse = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);
    const schema = await getPatientSchema();
    const patientId = parsePositiveInt(req.body.idPaciente || req.body.patientId);
    const questionnaireId = parsePositiveInt(req.body.idQuestionario || req.body.questionnaireId);
    const responses = req.body.respostas || req.body.responses;

    if (!patientId || !questionnaireId || !responses) {
      return res.status(400).json({ message: 'Dados inválidos' });
    }

    const questionario = await getQuestionnaireCourse(questionnaireId);

    if (!questionario) {
      return res.status(404).json({ message: 'Questionário não encontrado' });
    }

    if (!canRegisterClinicalRecord(user, questionario.id_curso)) {
      return res.status(403).json({
        message: 'Você não possui permissão para registrar prontuários neste curso'
      });
    }

    const [perguntas] = await pool.query(
      `SELECT p.id,
              p.titulo,
              p.descricao,
              p.tipo_pergunta,
              p.opcoes,
              qq.ordem_pergunta,
              qq.disposicao
       FROM perguntas p
       JOIN questoes_questionarios qq ON p.id = qq.id_pergunta
       WHERE qq.id_questionario = ?
         AND qq.ativo = TRUE
       ORDER BY qq.ordem_pergunta ASC`,
      [questionnaireId]
    );

    const dadosResposta = criarDadosResposta(perguntas, responses);
    const estruturaSnapshot = criarSnapshotProntuario({
      questionario,
      perguntas,
      profissional: user
    });

    const [result] = await pool.query(
      `INSERT INTO respostas_questionarios
       (${schema.questionnaireResponsePatientColumn}, id_questionario, id_profissional, dados_resposta, estrutura_snapshot)
       VALUES (?, ?, ?, ?, ?)`,
      [
        patientId,
        questionnaireId,
        user.id,
        JSON.stringify(dadosResposta),
        JSON.stringify(estruturaSnapshot)
      ]
    );

    // Registrar movimentação
    const [pacientes] = await pool.query('SELECT nome FROM pacientes WHERE id = ?', [patientId]);

    await registrarMovimentacao({
      id_usuario: user.id,
      id_paciente: patientId,
      id_curso: questionario.id_curso,
      tipo: 'Avaliação realizada',
      descricao: `Avaliação "${questionario.titulo || 'Questionário'}" realizada para ${pacientes[0]?.nome || 'Paciente'}`
    });

    res.status(201).json({
      id: result.insertId,
      message: 'Questionário respondido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar respostas:', error);
    res.status(500).json({ message: 'Erro ao salvar respostas' });
  }
};

export const getQuestionnaireResponses = async (req, res) => {
  try {
    const schema = await getPatientSchema();
    const patientId = parsePositiveInt(req.params.idPaciente || req.params.patientId);
    const questionnaireId = parsePositiveInt(req.params.idQuestionario || req.params.questionnaireId);

    if (!patientId || !questionnaireId) {
      return res.status(400).json({ message: 'IDs inválidos' });
    }

    const questionario = await getQuestionnaireCourse(questionnaireId);

    if (!questionario) {
      return res.status(404).json({ message: 'Questionário não encontrado' });
    }

    const [respostas] = await pool.query(
      `SELECT rq.id,
              rq.dados_resposta AS response_data,
              rq.estrutura_snapshot AS structure_snapshot,
              rq.respondido_em AS created_at,
              rq.id_profissional AS professional_id,
              u.nome AS professional_name,
              q.titulo AS questionnaire_title,
              q.descricao AS questionnaire_description,
              q.id_curso AS idCurso,
              c.nome AS course_name
       FROM respostas_questionarios rq
       JOIN questionarios q ON rq.id_questionario = q.id
       JOIN cursos c ON c.id = q.id_curso
       LEFT JOIN usuarios u ON u.id = rq.id_profissional
       WHERE rq.${schema.questionnaireResponsePatientColumn} = ?
         AND rq.id_questionario = ?
       ORDER BY rq.respondido_em DESC, rq.id DESC`,
      [patientId, questionnaireId]
    );

    res.json(respostas.map(aplicarSnapshotHistorico));
  } catch (error) {
    console.error('Erro ao obter respostas:', error);
    res.status(500).json({ message: 'Erro ao obter respostas' });
  }
};

export const getPatientQuestionnaireResponses = async (req, res) => {
  try {
    const schema = await getPatientSchema();
    const patientId = parsePositiveInt(req.params.idPaciente || req.params.patientId);

    if (!patientId) {
      return res.status(400).json({ message: 'ID de paciente inválido' });
    }

    const [respostas] = await pool.query(
      `SELECT rq.id,
              rq.id_questionario AS questionnaire_id,
              rq.dados_resposta AS response_data,
              rq.estrutura_snapshot AS structure_snapshot,
              rq.respondido_em AS created_at,
              rq.id_profissional AS professional_id,
              u.nome AS professional_name,
              q.titulo AS questionnaire_title,
              q.descricao AS questionnaire_description,
              q.id_curso AS idCurso,
              c.nome AS course_name
       FROM respostas_questionarios rq
       JOIN questionarios q ON q.id = rq.id_questionario
       JOIN cursos c ON c.id = q.id_curso
       LEFT JOIN usuarios u ON u.id = rq.id_profissional
       WHERE rq.${schema.questionnaireResponsePatientColumn} = ?
       ORDER BY rq.respondido_em DESC, rq.id DESC`,
      [patientId]
    );

    res.json(respostas.map(aplicarSnapshotHistorico));
  } catch (error) {
    console.error('Erro ao obter histórico interdisciplinar:', error);
    res.status(500).json({ message: 'Erro ao obter histórico do paciente' });
  }
};

export default {
  getQuestionsByCourse,
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionnaires,
  getPublishedQuestionnaires,
  getQuestionnairesByCourse,
  createQuestionnaire,
  updateQuestionnaire,
  publishQuestionnaire,
  deleteQuestionnaire,
  getQuestionnaireQuestions,
  saveQuestionnaireResponse,
  getQuestionnaireResponses,
  getPatientQuestionnaireResponses
};

