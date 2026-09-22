import pool from "./database.js";

/**
 * Registra uma movimentação na tabela movimentacoes
 * @param {Object} dados - Dados da movimentação
 * @param {number} dados.id_usuario - ID do usuário responsável
 * @param {number} dados.id_paciente - ID do paciente (opcional)
 * @param {number} dados.id_curso - ID do curso (opcional)
 * @param {number} dados.id_atividade - ID da atividade (opcional)
 * @param {string} dados.tipo - Tipo da movimentação (ex: "Frequência registrada", "Paciente cadastrado")
 * @param {string} dados.descricao - Descrição legível da movimentação
 * @param {Object} [conexao=null] - Conexão opcional com transação ativa
 */
export async function registrarMovimentacao(dados, conexao = null) {
  try {
    const {
      id_usuario,
      id_paciente = null,
      id_curso = null,
      id_atividade = null,
      tipo,
      descricao
    } = dados;

    if (!tipo || !descricao) {
      throw new Error("Tipo e descrição são obrigatórios");
    }

    const executor = conexao || pool;
    await executor.query(
      `INSERT INTO movimentacoes 
       (id_usuario, id_paciente, id_curso, id_atividade, tipo, descricao, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [id_usuario, id_paciente, id_curso, id_atividade, tipo, descricao]
    );
  } catch (error) {
    console.error("Erro ao registrar movimentação:", error);
    if (conexao) {
      throw error;
    }
  }
}

/**
 * Obtém movimentações recentes com filtros opcionais
 * @param {Object} filtros - Filtros opcionais
 * @param {number} filtros.limit - Limite de registros (padrão: 20)
 * @param {number} filtros.offset - Offset para paginação (padrão: 0)
 * @param {number} filtros.id_usuario - Filtrar por usuário
 * @param {number} filtros.id_paciente - Filtrar por paciente
 * @param {number} filtros.id_curso - Filtrar por curso
 * @param {string} filtros.tipo - Filtrar por tipo
 * @returns {Promise<Array>} Array de movimentações
 */
export async function obterMovimentacoesRecentes(filtros = {}) {
  try {
    const {
      limit = 20,
      offset = 0,
      id_usuario = null,
      id_paciente = null,
      id_curso = null,
      tipo = null,
      descricao = null,
      responsavel = null,
      data = null,
      data_de = null,
      data_ate = null,
      somente_professores = false,
      somenteHoje = false
    } = filtros;

    let consulta = `
      SELECT 
        m.id,
        m.id_usuario AS idUsuario,
        u.nome AS nomUsuario,
        u.papel AS role,
        m.id_paciente AS idPaciente,
        p.nome AS nomePaciente,
        m.id_curso AS idCurso,
        c.nome AS nomeCurso,
        m.id_atividade AS idAtividade,
        aa.nome AS nomeAtividade,
        m.tipo,
        m.descricao,
        m.criado_em AS criadoEm,
        DATE_FORMAT(m.criado_em, '%d/%m/%Y %H:%i') AS dataFormatada
      FROM movimentacoes m
      LEFT JOIN usuarios u ON u.id = m.id_usuario
      LEFT JOIN pacientes p ON p.id = m.id_paciente
      LEFT JOIN cursos c ON c.id = m.id_curso
      LEFT JOIN atividades_atendimento aa ON aa.id = m.id_atividade
      WHERE 1 = 1
    `;

    const parametros = [];

    if (id_usuario) {
      consulta += " AND m.id_usuario = ?";
      parametros.push(id_usuario);
    }

    if (id_paciente) {
      consulta += " AND m.id_paciente = ?";
      parametros.push(id_paciente);
    }

    if (id_curso) {
      consulta += " AND m.id_curso = ?";
      parametros.push(id_curso);
    }

    if (tipo) {
      consulta += " AND m.tipo = ?";
      parametros.push(tipo);
    }

    if (descricao) {
      consulta += " AND m.descricao LIKE ?";
      parametros.push(`%${descricao}%`);
    }

    if (responsavel) {
      consulta += " AND u.nome LIKE ?";
      parametros.push(`%${responsavel}%`);
    }

    if (data) {
      consulta += " AND m.criado_em >= ? AND m.criado_em < DATE_ADD(?, INTERVAL 1 DAY)";
      parametros.push(data, data);
    }

    if (data_de) {
      consulta += " AND m.criado_em >= ?";
      parametros.push(data_de);
    }

    if (data_ate) {
      consulta += " AND m.criado_em < DATE_ADD(?, INTERVAL 1 DAY)";
      parametros.push(data_ate);
    }

    if (somente_professores) {
      consulta += " AND u.papel = 'PROFESSOR'";
    }

    if (somenteHoje) {
      consulta += " AND m.criado_em >= CURDATE() AND m.criado_em < DATE_ADD(CURDATE(), INTERVAL 1 DAY)";
    }

    consulta += " ORDER BY m.criado_em DESC LIMIT ? OFFSET ?";
    parametros.push(limit, offset);

    const [movimentacoes] = await pool.query(consulta, parametros);
    return movimentacoes;
  } catch (error) {
    console.error("Erro ao obter movimentações:", error);
    return [];
  }
}
