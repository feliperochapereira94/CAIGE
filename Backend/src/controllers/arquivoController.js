import pool from "../models/database.js";
import { getArchivedUsers, getArchivedPatients } from "../models/arquivoModel.js";
import { getPatientSchema } from "../models/esquemaModel.js";
import { registrarMovimentacao } from "../models/movimentacoesModel.js";
import { parsePositiveInt } from "../models/validacaoModel.js";

export async function listArchivedUsers(req, res) {
  try {
    const rows = await getArchivedUsers();
    return res.status(200).json({ archived_users: rows });
  } catch (error) {
    console.error("Erro ao buscar usuarios arquivados:", error);
    return res.status(500).json({ message: "Erro ao buscar usuarios arquivados." });
  }
}

export async function recoverArchivedUser(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "ID de usuário inválido." });

    const [[current]] = await pool.query(
      'SELECT id, email, ativo, oculto FROM usuarios WHERE id = ? LIMIT 1',
      [id]
    );
    if (!current) return res.status(404).json({ message: "Usuário não encontrado." });
    if (String(current.email || '').trim().toLowerCase() === 'suportecaige@univale.br') {
      return res.status(409).json({ message: "A conta Suporte CAIGE é protegida." });
    }
    if (!(current.oculto === 1 || current.oculto === true)) {
      return res.status(400).json({ message: "Este usuário não está arquivado." });
    }

    await pool.query('UPDATE usuarios SET oculto = FALSE, ativo = FALSE WHERE id = ?', [id]);
    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      tipo: 'Usuário recuperado',
      descricao: `Usuário recuperado dos arquivados: ${current.email}`
    });
    return res.status(200).json({ message: "Usuário recuperado com sucesso como inativo." });
  } catch (error) {
    console.error("Erro ao recuperar usuário arquivado:", error);
    return res.status(500).json({ message: "Erro ao recuperar usuário arquivado." });
  }
}

export async function listArchivedPatients(req, res) {
  try {
    const rows = await getArchivedPatients();
    return res.status(200).json({ archived_patients: rows });
  } catch (error) {
    console.error("Erro ao buscar pacientes arquivados:", error);
    return res.status(500).json({ message: "Erro ao buscar pacientes arquivados." });
  }
}

export async function recoverArchivedPatient(req, res) {
  try {
    const { patientTable } = await getPatientSchema();
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de paciente inválido." });
    }

    const [[current]] = await pool.query(
      `SELECT id, nome AS name, status, oculto FROM ${patientTable} WHERE id = ?`,
      [id]
    );

    if (!current) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    // Regra 5: Somente permitir recuperar quando status = 'arquivado' AND oculto = FALSE
    const isOculto = current.oculto === 1 || current.oculto === true;
    if (current.status !== 'arquivado' || isOculto) {
      return res.status(400).json({ message: "Apenas pacientes arquivados e não ocultados podem ser recuperados." });
    }

    // Retorna obrigatoriamente como 'inativo' e oculto = FALSE
    await pool.query(
      `UPDATE ${patientTable} SET status = 'inativo', oculto = FALSE WHERE id = ?`,
      [id]
    );

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      id_paciente: id,
      tipo: 'Paciente recuperado',
      descricao: `Paciente recuperado: ${current.name} (ID: ${id})`
    });

    return res.status(200).json({ message: "Paciente recuperado com sucesso para o status inativo." });
  } catch (error) {
    console.error("Erro ao recuperar paciente arquivado:", error);
    return res.status(500).json({ message: "Erro ao recuperar paciente arquivado." });
  }
}

export async function hideArchivedPatient(req, res) {
  try {
    const { patientTable } = await getPatientSchema();
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de paciente inválido." });
    }

    const [[current]] = await pool.query(
      `SELECT id, nome AS name, status, oculto FROM ${patientTable} WHERE id = ?`,
      [id]
    );

    if (!current) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    // Regra 6: Somente permitir essa operação quando status = 'arquivado' AND oculto = FALSE
    const isOculto = current.oculto === 1 || current.oculto === true;
    if (current.status !== 'arquivado' || isOculto) {
      return res.status(400).json({ message: "Apenas pacientes arquivados podem ser excluídos permanentemente da interface." });
    }

    // NUNCA DELETE físico. Apenas exclusão lógica definitiva da interface
    await pool.query(
      `UPDATE ${patientTable} SET oculto = TRUE WHERE id = ?`,
      [id]
    );

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      id_paciente: id,
      tipo: 'Paciente ocultado',
      descricao: `Paciente excluído permanentemente da interface: ${current.name} (ID: ${id})`
    });

    return res.status(200).json({ message: "Paciente excluído permanentemente da interface com sucesso." });
  } catch (error) {
    console.error("Erro ao ocultar paciente definitivamente:", error);
    return res.status(500).json({ message: "Erro ao excluir permanentemente o paciente da interface." });
  }
}
