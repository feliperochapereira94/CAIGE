import pool from "./database.js";
import { getPatientSchema } from "./esquemaModel.js";

export async function getArchivedUsers() {
  const [rows] = await pool.query(
      `SELECT u.id, u.nome AS name, u.email, u.papel AS role,
              u.id_curso AS course_id, c.nome AS course_name,
              u.ativo AS is_active, u.oculto AS is_hidden,
              DATE_FORMAT(u.criado_em, '%d/%m/%Y %H:%i') AS created_at
         FROM usuarios u
         LEFT JOIN cursos c ON c.id = u.id_curso
        WHERE u.oculto = TRUE
        ORDER BY u.criado_em DESC`
  );

  return rows;
}

export async function getArchivedPatients() {
  const { patientTable } = await getPatientSchema();
  const [rows] = await pool.query(
      `SELECT id, nome AS name, cpf, telefone AS phone, celular AS phone2, status,
        DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i') AS created_at
     FROM ${patientTable}
       WHERE status = 'arquivado' AND (oculto = FALSE OR oculto IS NULL)
       ORDER BY criado_em DESC`
  );

  return rows;
}

