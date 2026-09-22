let schemaPromise = null;

export async function getPatientSchema() {
  if (!schemaPromise) {
    schemaPromise = Promise.resolve({
      patientTable: "pacientes",
      attendancePatientColumn: "id_paciente",
      questionnaireResponsePatientColumn: "id_paciente"
    });
  }

  return schemaPromise;
}

export async function resolvePermissionColumn(permission) {
  const allowedColumns = new Set([
    "pode_visualizar_paciente",
    "pode_criar_paciente",
    "pode_editar_paciente",
    "pode_registrar_frequencia",
    "pode_visualizar_relatorios",
    "pode_gerenciar_atividades",
    "pode_visualizar_questionarios"
  ]);

  if (!allowedColumns.has(permission)) {
    throw new Error("Permissao invalida");
  }

  return permission;
}

