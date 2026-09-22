import pool from "../models/database.js";
import { registrarMovimentacao } from "../models/movimentacoesModel.js";
import { getPatientSchema } from "../models/esquemaModel.js";
import { parsePagination, parsePositiveInt } from "../models/validacaoModel.js";


async function obterFotosPacientes() {
  try {
    const { readdir } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const dir = fileURLToPath(new URL('../../../Frontend/recursos/uploads/pacientes/', import.meta.url));
    const files = await readdir(dir);
    return new Set(files.filter((name) => /^\d+\.webp$/i.test(name)).map((name) => Number(name.replace(/\.webp$/i, ''))));
  } catch (error) {
    if (error?.code === 'ENOENT') return new Set();
    throw error;
  }
}

function caminhoFotoPaciente(id, fotos) {
  return fotos.has(Number(id)) ? `/recursos/uploads/pacientes/${Number(id)}.webp` : null;
}

async function obterCaminhoFotoPaciente(id) {
  const patientId = Number(id);
  if (!Number.isInteger(patientId) || patientId <= 0) return null;
  try {
    const { access } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { resolve } = await import('node:path');
    const dir = fileURLToPath(new URL('../../../Frontend/recursos/uploads/pacientes/', import.meta.url));
    await access(resolve(dir, `${patientId}.webp`));
    return `/recursos/uploads/pacientes/${patientId}.webp`;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

const NOME_SOMENTE_LETRAS = /^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u;
const nomeValido = (valor) => NOME_SOMENTE_LETRAS.test(String(valor || '').trim());

function normalizePatientStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "inativo") {
    return "inativo";
  }

  if (normalized === "archived") {
    return "arquivado";
  }

  if (normalized === "arquivado") {
    return "arquivado";
  }

  return "ativo";
}

const PARTICULAS_NOME = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const PARTICULAS_TITULO = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'no', 'na', 'nos', 'nas'
]);

function sanitizarEspacos(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/\s+/g, ' ').trim();
}

function capitalizarSegmento(seg) {
  if (!seg) return '';
  if (seg.includes("'")) {
    return seg
      .split("'")
      .map((parte) => {
        if (!parte) return '';
        return parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1).toLocaleLowerCase('pt-BR');
      })
      .join("'");
  }
  if (seg.includes('-')) {
    return seg
      .split('-')
      .map((parte) => capitalizarSegmento(parte))
      .join('-');
  }
  return seg.charAt(0).toLocaleUpperCase('pt-BR') + seg.slice(1).toLocaleLowerCase('pt-BR');
}

function normalizarNomePessoa(valor, options = {}) {
  const limpo = sanitizarEspacos(valor);
  if (!limpo) {
    return options.nullable ? null : '';
  }
  const palavras = limpo.split(' ');
  const resultado = palavras.map((palavra, index) => {
    const lower = palavra.toLocaleLowerCase('pt-BR');
    if (index > 0 && PARTICULAS_NOME.has(lower)) {
      return lower;
    }
    return capitalizarSegmento(palavra);
  });
  return resultado.join(' ');
}

function normalizarSegmentoEndereco(valor, options = {}) {
  const limpo = sanitizarEspacos(valor);
  if (!limpo) {
    return options.nullable ? null : '';
  }
  const palavras = limpo.split(' ');
  const resultado = palavras.map((palavra, index) => {
    const lower = palavra.toLocaleLowerCase('pt-BR');
    if (index > 0 && PARTICULAS_TITULO.has(lower)) {
      return lower;
    }
    return capitalizarSegmento(palavra);
  });
  return resultado.join(' ');
}

function normalizarEstado(valor) {
  const limpo = sanitizarEspacos(valor);
  if (!limpo) return '';
  if (limpo.length === 2) {
    return limpo.toLocaleUpperCase('pt-BR');
  }
  return normalizarSegmentoEndereco(limpo);
}

function normalizarTextoLivre(valor, options = {}) {
  const trimmed = String(valor ?? '').trim();
  if (!trimmed) {
    return options.nullable ? null : '';
  }
  return trimmed;
}

function normalizarItensClinicos(valor, options = {}) {
  if (valor === null || valor === undefined) {
    return options.nullable ? null : '';
  }
  const str = String(valor).trim();
  if (!str) {
    return options.nullable ? null : '';
  }
  const linhas = str
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
  if (!linhas.length) {
    return options.nullable ? null : '';
  }
  return linhas.join('\n');
}

function normalizePatientTextFields(data) {
  return {
    name: normalizarNomePessoa(data.name),
    street: normalizarSegmentoEndereco(data.street),
    neighborhood: normalizarSegmentoEndereco(data.neighborhood),
    city: normalizarSegmentoEndereco(data.city),
    responsible: normalizarNomePessoa(data.responsible),
    parentesco_responsavel: normalizarSegmentoEndereco(
      data.responsible_relationship ?? data.parentesco_responsavel,
      { nullable: true }
    ),
    observations: normalizarTextoLivre(
      data.observations,
      { nullable: true }
    ),
    health_conditions: normalizarItensClinicos(
      data.health_conditions,
      { nullable: true }
    ),
    allergies: normalizarItensClinicos(
      data.allergies,
      { nullable: true }
    ),
    medications_in_use: normalizarItensClinicos(
      data.medications_in_use,
      { nullable: true }
    ),
    clinical_observations: normalizarTextoLivre(
      data.clinical_observations,
      { nullable: true }
    )
  };
}

function normalizarAlturaCm(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const str = String(valor).trim();
  if (!/^\d{2,3}$/.test(str)) {
    return null;
  }

  const num = parseInt(str, 10);
  if (!Number.isFinite(num) || num < 30 || num > 250) {
    return null;
  }

  return num;
}

function normalizarPesoKg(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const str = String(valor).trim().replace(",", ".");
  if (!/^\d+([.]\d+)?$/.test(str)) {
    return null;
  }

  const num = Number(str);
  if (!Number.isFinite(num) || num < 1 || num > 500) {
    return null;
  }

  return num;
}

function processarCategoriaClinica({
  texto,
  avaliadoFlag,
  semOcorrenciasFlag,
  nomeCampo,
  nomeRotulo
}) {
  const textoLimpo = texto ? String(texto).trim() : "";
  const temConteudo = textoLimpo.length > 0;

  const flagAvaliadoFornecida = avaliadoFlag !== undefined && avaliadoFlag !== null;
  const flagAvaliado = Boolean(
    avaliadoFlag === true || avaliadoFlag === "true" || avaliadoFlag === 1
  );
  const flagSemOcorrencias = Boolean(
    semOcorrenciasFlag === true || semOcorrenciasFlag === "true" || semOcorrenciasFlag === 1
  );

  // 1. Estado inconsistente: flag explicitamente FALSE com conteúdo presente
  if (flagAvaliadoFornecida && !flagAvaliado && temConteudo) {
    return {
      valido: false,
      mensagem: `Estado inconsistente: ${nomeRotulo.toLowerCase()} informadas com confirmação negativa de avaliação.`
    };
  }

  // 2. Estado inconsistente: marcou "sem ocorrências" mas forneceu itens
  if (flagSemOcorrencias && temConteudo) {
    return {
      valido: false,
      mensagem: `Não é permitido marcar 'sem ocorrências' e cadastrar ${nomeRotulo.toLowerCase()} simultaneamente.`
    };
  }

  // 3. Determinar se a categoria foi avaliada
  const foiAvaliada = flagSemOcorrencias || temConteudo || (flagAvaliadoFornecida && flagAvaliado);

  // 4. Se a categoria NÃO foi avaliada e não tem conteúdo: inválido para salvar
  if (!foiAvaliada) {
    return {
      valido: false,
      mensagem: `Informe as ${nomeRotulo.toLowerCase()} do paciente ou confirme que não há ocorrências.`
    };
  }

  // 5. Estado válido
  return {
    valido: true,
    textoFinal: flagSemOcorrencias ? null : (temConteudo ? texto : null),
    avaliadaFinal: 1
  };
}

export async function getAllPatients(req, res) {
  try {
    const { patientTable } = await getPatientSchema();

    const search =
      typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    const terms =
      search
        ? search
            .split(/\s+/)
            .filter(Boolean)
        : [];

    const pageCandidate = Number.parseInt(req.query.page, 10);
    const limitCandidate = Number.parseInt(req.query.limit, 10);
    const parsedLimit =
      Number.isInteger(limitCandidate) && limitCandidate > 0
        ? limitCandidate
        : 50;

    let rawOffset = req.query.offset;
    if (
      rawOffset === undefined &&
      Number.isInteger(pageCandidate) &&
      pageCandidate > 0
    ) {
      rawOffset = (pageCandidate - 1) * parsedLimit;
    }

    const { limit, offset } =
      parsePagination(
        req.query.limit,
        rawOffset,
        {
          limit: 50,
          maxLimit: 100
        }
      );

    let query = `
      SELECT
        id,
        nome AS name,
        data_nascimento AS birth_date,
        cpf,
        telefone AS phone,
        celular AS phone2,
        rua AS street,
        bairro AS neighborhood,
        cidade AS city,
        estado AS state,
        status
      FROM ${patientTable}
      WHERE (oculto = FALSE OR oculto IS NULL)
        AND (status IS NULL OR status <> 'arquivado')
    `;

    const params = [];

    const statusFilter =
      typeof req.query.status === "string"
        ? req.query.status.trim().toLowerCase()
        : "";
    if (statusFilter === "ativo") {
      query += " AND (status = 'ativo' OR status IS NULL)";
    } else if (statusFilter === "inativo") {
      query += " AND status = 'inativo'";
    }

    if (terms.length > 0) {
      terms.forEach((term) => {
        const like = `%${term}%`;

        query += `
          AND (
            nome COLLATE utf8mb4_unicode_ci LIKE ?
            OR CAST(id AS CHAR) LIKE ?
            OR COALESCE(cpf, '') LIKE ?
            OR COALESCE(telefone, '') LIKE ?
            OR COALESCE(celular, '') LIKE ?
            OR COALESCE(rua, '') COLLATE utf8mb4_unicode_ci LIKE ?
            OR COALESCE(bairro, '') COLLATE utf8mb4_unicode_ci LIKE ?
            OR COALESCE(cidade, '') COLLATE utf8mb4_unicode_ci LIKE ?
            OR COALESCE(estado, '') COLLATE utf8mb4_unicode_ci LIKE ?
            OR COALESCE(status, '') COLLATE utf8mb4_unicode_ci LIKE ?
          )
        `;

        params.push(
          like,
          like,
          like,
          like,
          like,
          like,
          like,
          like,
          like,
          like
        );
      });
    }

    query += " ORDER BY id DESC LIMIT ? OFFSET ?";

    params.push(limit, offset);

    const [patients] =
      await pool.query(
        query,
        params
      );

    const fotosPacientes = await obterFotosPacientes();

    const formattedPatients =
      patients.map((person) => {
        const birthDate =
          person.birth_date
            ? new Date(person.birth_date)
            : null;

        const today = new Date();

        let age = 0;

        if (
          birthDate &&
          !Number.isNaN(
            birthDate.getTime()
          )
        ) {
          age =
            today.getFullYear() -
            birthDate.getFullYear();

          const monthDiff =
            today.getMonth() -
            birthDate.getMonth();

          if (
            monthDiff < 0 ||
            (
              monthDiff === 0 &&
              today.getDate() <
              birthDate.getDate()
            )
          ) {
            age--;
          }
        }

        const addressParts = [
          person.neighborhood,
          person.city,
          person.state
        ].filter(Boolean);

        const address =
          addressParts.length
            ? addressParts.join(", ")
            : "Endereço não informado";

        return {
          id: person.id,
          name: person.name,
          photo: caminhoFotoPaciente(person.id, fotosPacientes),
          age,
          cpf: person.cpf || "",
          phone:
            person.phone ||
            person.phone2 ||
            "N/A",
          phone2:
            person.phone2 || "",
          street:
            person.street || "",
          neighborhood:
            person.neighborhood || "",
          city:
            person.city || "",
          state:
            person.state || "",
          address,
          location: address,
          initials:
            String(person.name || "")
              .split(" ")
              .filter(Boolean)
              .map((word) => word[0])
              .join("")
              .toUpperCase()
              .substring(0, 2),
          status:
            normalizePatientStatus(
              person.status
            )
        };
      });

    return res
      .status(200)
      .json(formattedPatients);
  } catch (error) {
    console.error(
      "Erro ao buscar pacientes:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Erro ao buscar pacientes."
      });
  }
}

export async function getPatient(req, res) {
  try {
    const { patientTable } = await getPatientSchema();
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de paciente inválido." });
    }

    const [patients] = await pool.query(
      `SELECT id, nome AS name, data_nascimento AS birth_date, genero AS gender, cpf, telefone AS phone, celular AS phone2,
              cep, rua AS street, numero AS number, bairro AS neighborhood, cidade AS city, estado AS state,
              responsavel AS responsible, parentesco_responsavel AS responsible_relationship, telefone_responsavel AS responsible_phone,
              observacoes AS observations,
              condicoes_saude AS health_conditions,
              condicoes_saude_avaliadas AS health_conditions_evaluated,
              alergias AS allergies,
              alergias_avaliadas AS allergies_evaluated,
              medicamentos_uso AS medications_in_use,
              medicamentos_avaliados AS medications_in_use_evaluated,
              observacoes_clinicas AS clinical_observations,
              peso_kg AS weight_kg, altura_cm AS height_cm, status, criado_em AS created_at
       FROM ${patientTable} WHERE id = ?`,
      [id]
    );

    if (patients.length === 0) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    const photo = await obterCaminhoFotoPaciente(id);

    return res.status(200).json({
      ...patients[0],
      photo,
      health_conditions_evaluated: Boolean(patients[0].health_conditions_evaluated),
      allergies_evaluated: Boolean(patients[0].allergies_evaluated),
      medications_in_use_evaluated: Boolean(patients[0].medications_in_use_evaluated),
      status: normalizePatientStatus(patients[0].status)
    });
  } catch (error) {
    console.error("Erro ao buscar paciente:", error);
    return res.status(500).json({ message: "Erro ao buscar paciente." });
  }
}

export async function createPatient(req, res) {
  try {
    const { patientTable } = await getPatientSchema();
    const {
      name,
      birth_date,
      gender,
      cpf,
      phone,
      phone2,
      cep,
      street,
      number,
      neighborhood,
      city,
      state,
      responsible,
      responsible_relationship,
      responsible_phone,
      observations,
      health_conditions,
      allergies,
      medications_in_use,
      clinical_observations,
      weight_kg,
      height_cm,
      status
    } = req.body;

    const normalizePhone = (value) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    const phonePrimary = normalizePhone(phone);
    const phoneSecondary = normalizePhone(phone2);
    const phoneResponsible = normalizePhone(responsible_phone);
    const cpfTrim = typeof cpf === "string" ? cpf.trim() : "";
    const cepTrim = typeof cep === "string" ? cep.trim() : "";
    const hasWeight = weight_kg !== null && weight_kg !== undefined && String(weight_kg).trim() !== "";
    const hasHeight = height_cm !== null && height_cm !== undefined && String(height_cm).trim() !== "";
    const normalizedText =
      normalizePatientTextFields(req.body);
    const residentialPattern = /^\(\d{2}\)\s\d{4}-\d{4}$/;
    const mobilePattern = /^\(\d{2}\)\s\d{5}-\d{4}$/;

    if (
      !normalizedText.name ||
      !birth_date ||
      !gender ||
      !cpfTrim ||
      !cepTrim ||
      !normalizedText.street ||
      !number ||
      !normalizedText.neighborhood ||
      !normalizedText.city ||
      !state ||
      !normalizedText.responsible ||
      !normalizedText.parentesco_responsavel ||
      !phoneResponsible ||
      !hasWeight ||
      !hasHeight ||
      !status
    ) {
      return res.status(400).json({ message: "Preencha todos os campos obrigatórios." });
    }

    if (!nomeValido(normalizedText.name)) {
      return res.status(400).json({ message: "O nome do paciente deve conter somente letras." });
    }
    if (!nomeValido(normalizedText.responsible)) {
      return res.status(400).json({ message: "O nome do responsável deve conter somente letras." });
    }

    const clinicaCondicoes = processarCategoriaClinica({
      texto: normalizedText.health_conditions,
      avaliadoFlag: req.body.health_conditions_evaluated ?? req.body.condicoes_saude_avaliadas,
      semOcorrenciasFlag: req.body.has_no_health_conditions ?? req.body.sem_condicoes_saude,
      nomeCampo: "health_conditions",
      nomeRotulo: "Condições de saúde"
    });
    if (!clinicaCondicoes.valido) {
      return res.status(400).json({ message: clinicaCondicoes.mensagem });
    }

    const clinicaAlergias = processarCategoriaClinica({
      texto: normalizedText.allergies,
      avaliadoFlag: req.body.allergies_evaluated ?? req.body.alergias_avaliadas,
      semOcorrenciasFlag: req.body.has_no_allergies ?? req.body.sem_alergias,
      nomeCampo: "allergies",
      nomeRotulo: "Alergias"
    });
    if (!clinicaAlergias.valido) {
      return res.status(400).json({ message: clinicaAlergias.mensagem });
    }

    const clinicaMedicamentos = processarCategoriaClinica({
      texto: normalizedText.medications_in_use,
      avaliadoFlag: req.body.medications_in_use_evaluated ?? req.body.medicamentos_avaliados,
      semOcorrenciasFlag: req.body.has_no_medications ?? req.body.sem_medicamentos,
      nomeCampo: "medications_in_use",
      nomeRotulo: "Medicamentos em uso"
    });
    if (!clinicaMedicamentos.valido) {
      return res.status(400).json({ message: clinicaMedicamentos.mensagem });
    }

    const cpfDigits = cpfTrim.replace(/\D/g, "");
    if (cpfDigits.length > 0 && cpfDigits.length !== 11 && !cpfTrim.includes("/")) {
      return res.status(400).json({ message: "CPF inválido. Use o formato 000.000.000-00." });
    }
    if (cpfTrim.length < 3) {
      return res.status(400).json({ message: "Documento inválido." });
    }

    const cepDigits = cepTrim.replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      return res.status(400).json({ message: "CEP inválido. Use o padrão 00000-000." });
    }

    const alturaNormalizada = normalizarAlturaCm(height_cm);
    if (alturaNormalizada === null) {
      return res.status(400).json({ message: "Altura inválida. Informe a altura em centímetros (número inteiro entre 30 e 250 cm)." });
    }

    const pesoNormalizado = normalizarPesoKg(weight_kg);
    if (pesoNormalizado === null) {
      return res.status(400).json({ message: "Peso inválido. Informe o peso em kg (entre 1 e 500 kg)." });
    }

    if (!phonePrimary && !phoneSecondary) {
      return res.status(400).json({ message: "Informe ao menos Telefone Residencial ou Celular." });
    }

    if (phonePrimary && !residentialPattern.test(phonePrimary)) {
      return res.status(400).json({ message: "Telefone residencial inválido. Use o padrão (00) 0000-0000." });
    }

    if (phoneSecondary && !mobilePattern.test(phoneSecondary)) {
      return res.status(400).json({ message: "Celular inválido. Use o padrão (00) 00000-0000." });
    }

    if (phoneResponsible && !residentialPattern.test(phoneResponsible) && !mobilePattern.test(phoneResponsible)) {
      return res.status(400).json({ message: "Telefone do responsável inválido. Use o padrão (00) 0000-0000 ou (00) 00000-0000." });
    }

    const [result] = await pool.query(
      `INSERT INTO ${patientTable} (
        nome, data_nascimento, genero, cpf, telefone, celular, cep, rua, numero, bairro, cidade, estado,
        responsavel, parentesco_responsavel, telefone_responsavel, observacoes,
        condicoes_saude, condicoes_saude_avaliadas,
        alergias, alergias_avaliadas,
        medicamentos_uso, medicamentos_avaliados,
        observacoes_clinicas, peso_kg, altura_cm, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedText.name, birth_date, gender || null, cpfTrim, phonePrimary, phoneSecondary, cepTrim, normalizedText.street, number, normalizedText.neighborhood, normalizedText.city, normalizarEstado(state),
        normalizedText.responsible, normalizedText.parentesco_responsavel || null, phoneResponsible, normalizedText.observations,
        clinicaCondicoes.textoFinal, clinicaCondicoes.avaliadaFinal,
        clinicaAlergias.textoFinal, clinicaAlergias.avaliadaFinal,
        clinicaMedicamentos.textoFinal, clinicaMedicamentos.avaliadaFinal,
        normalizedText.clinical_observations, pesoNormalizado, alturaNormalizada, status
      ]
    );

    // Registrar movimentação
    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      id_paciente: result.insertId,
      tipo: 'Paciente cadastrado',
      descricao: `Paciente ${normalizedText.name} cadastrado`
    });

    return res.status(201).json({ message: "Paciente cadastrado com sucesso!", id: result.insertId });
  } catch (error) {
    console.error("Erro ao cadastrar paciente:", error);
    return res.status(500).json({ message: "Erro ao cadastrar paciente." });
  }
}

export async function updatePatient(req, res) {
  try {
    const { patientTable } = await getPatientSchema();
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de paciente inválido." });
    }
    const {
      name,
      birth_date,
      gender,
      cpf,
      phone,
      phone2,
      cep,
      street,
      number,
      neighborhood,
      city,
      state,
      responsible,
      responsible_relationship,
      responsible_phone,
      observations,
      health_conditions,
      allergies,
      medications_in_use,
      clinical_observations,
      weight_kg,
      height_cm,
      status
    } = req.body;

    const normalizePhone = (value) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    const phonePrimary = normalizePhone(phone);
    const phoneSecondary = normalizePhone(phone2);
    const phoneResponsible = normalizePhone(responsible_phone);
    const cpfTrim = typeof cpf === "string" ? cpf.trim() : "";
    const cepTrim = typeof cep === "string" ? cep.trim() : "";
    const hasWeight = weight_kg !== null && weight_kg !== undefined && String(weight_kg).trim() !== "";
    const hasHeight = height_cm !== null && height_cm !== undefined && String(height_cm).trim() !== "";
    const normalizedText =
      normalizePatientTextFields(req.body);
    const residentialPattern = /^\(\d{2}\)\s\d{4}-\d{4}$/;
    const mobilePattern = /^\(\d{2}\)\s\d{5}-\d{4}$/;

    if (
      !normalizedText.name ||
      !birth_date ||
      !gender ||
      !cpfTrim ||
      !cepTrim ||
      !normalizedText.street ||
      !number ||
      !normalizedText.neighborhood ||
      !normalizedText.city ||
      !state ||
      !normalizedText.responsible ||
      !normalizedText.parentesco_responsavel ||
      !phoneResponsible ||
      !hasWeight ||
      !hasHeight ||
      !status
    ) {
      return res.status(400).json({ message: "Preencha todos os campos obrigatórios." });
    }

    if (!nomeValido(normalizedText.name)) {
      return res.status(400).json({ message: "O nome do paciente deve conter somente letras." });
    }
    if (!nomeValido(normalizedText.responsible)) {
      return res.status(400).json({ message: "O nome do responsável deve conter somente letras." });
    }

    const clinicaCondicoes = processarCategoriaClinica({
      texto: normalizedText.health_conditions,
      avaliadoFlag: req.body.health_conditions_evaluated ?? req.body.condicoes_saude_avaliadas,
      semOcorrenciasFlag: req.body.has_no_health_conditions ?? req.body.sem_condicoes_saude,
      nomeCampo: "health_conditions",
      nomeRotulo: "Condições de saúde"
    });
    if (!clinicaCondicoes.valido) {
      return res.status(400).json({ message: clinicaCondicoes.mensagem });
    }

    const clinicaAlergias = processarCategoriaClinica({
      texto: normalizedText.allergies,
      avaliadoFlag: req.body.allergies_evaluated ?? req.body.alergias_avaliadas,
      semOcorrenciasFlag: req.body.has_no_allergies ?? req.body.sem_alergias,
      nomeCampo: "allergies",
      nomeRotulo: "Alergias"
    });
    if (!clinicaAlergias.valido) {
      return res.status(400).json({ message: clinicaAlergias.mensagem });
    }

    const clinicaMedicamentos = processarCategoriaClinica({
      texto: normalizedText.medications_in_use,
      avaliadoFlag: req.body.medications_in_use_evaluated ?? req.body.medicamentos_avaliados,
      semOcorrenciasFlag: req.body.has_no_medications ?? req.body.sem_medicamentos,
      nomeCampo: "medications_in_use",
      nomeRotulo: "Medicamentos em uso"
    });
    if (!clinicaMedicamentos.valido) {
      return res.status(400).json({ message: clinicaMedicamentos.mensagem });
    }

    const cpfDigits = cpfTrim.replace(/\D/g, "");
    if (cpfDigits.length > 0 && cpfDigits.length !== 11 && !cpfTrim.includes("/")) {
      return res.status(400).json({ message: "CPF inválido. Use o formato 000.000.000-00." });
    }
    if (cpfTrim.length < 3) {
      return res.status(400).json({ message: "Documento inválido." });
    }

    const cepDigits = cepTrim.replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      return res.status(400).json({ message: "CEP inválido. Use o padrão 00000-000." });
    }

    const alturaNormalizada = normalizarAlturaCm(height_cm);
    if (alturaNormalizada === null) {
      return res.status(400).json({ message: "Altura inválida. Informe a altura em centímetros (número inteiro entre 30 e 250 cm)." });
    }

    const pesoNormalizado = normalizarPesoKg(weight_kg);
    if (pesoNormalizado === null) {
      return res.status(400).json({ message: "Peso inválido. Informe o peso em kg (entre 1 e 500 kg)." });
    }

    if (!phonePrimary && !phoneSecondary) {
      return res.status(400).json({ message: "Informe ao menos Telefone Residencial ou Celular." });
    }

    if (phonePrimary && !residentialPattern.test(phonePrimary)) {
      return res.status(400).json({ message: "Telefone residencial inválido. Use o padrão (00) 0000-0000." });
    }

    if (phoneSecondary && !mobilePattern.test(phoneSecondary)) {
      return res.status(400).json({ message: "Celular inválido. Use o padrão (00) 00000-0000." });
    }

    if (phoneResponsible && !residentialPattern.test(phoneResponsible) && !mobilePattern.test(phoneResponsible)) {
      return res.status(400).json({ message: "Telefone do responsável inválido. Use o padrão (00) 0000-0000 ou (00) 00000-0000." });
    }

    const [[current]] = await pool.query(`SELECT status, oculto FROM ${patientTable} WHERE id = ?`, [id]);

    if (!current) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    if (current.oculto === 1 || current.oculto === true) {
      return res.status(400).json({ message: "Paciente ocultado definitivamente não pode ser editado." });
    }

    if (current.status === 'arquivado') {
      return res.status(400).json({ message: "Paciente arquivado não pode ser editado diretamente. Recupere o paciente antes de editá-lo." });
    }

    if (status === 'arquivado') {
      return res.status(400).json({ message: "O status 'arquivado' não pode ser atribuído via edição. Utilize a opção de arquivamento." });
    }

    const [result] = await pool.query(
      `UPDATE ${patientTable}
       SET nome = ?, data_nascimento = ?, genero = ?, cpf = ?, telefone = ?, celular = ?,
       cep = ?, rua = ?, numero = ?, bairro = ?, cidade = ?, estado = ?,
       responsavel = ?, parentesco_responsavel = ?, telefone_responsavel = ?, observacoes = ?,
       condicoes_saude = ?, condicoes_saude_avaliadas = ?,
       alergias = ?, alergias_avaliadas = ?,
       medicamentos_uso = ?, medicamentos_avaliados = ?,
       observacoes_clinicas = ?, peso_kg = ?, altura_cm = ?, status = ?
       WHERE id = ?`,
      [
        normalizedText.name, birth_date, gender || null, cpfTrim, phonePrimary, phoneSecondary, cepTrim, normalizedText.street, number, normalizedText.neighborhood, normalizedText.city, normalizarEstado(state),
        normalizedText.responsible, normalizedText.parentesco_responsavel || null, phoneResponsible, normalizedText.observations,
        clinicaCondicoes.textoFinal, clinicaCondicoes.avaliadaFinal,
        clinicaAlergias.textoFinal, clinicaAlergias.avaliadaFinal,
        clinicaMedicamentos.textoFinal, clinicaMedicamentos.avaliadaFinal,
        normalizedText.clinical_observations, pesoNormalizado, alturaNormalizada, status, id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
    const previousStatus = normalizeStatus(current.status || 'ativo');
    const nextStatus = normalizeStatus(status);
    const statusChanged = previousStatus !== nextStatus;

    let activityDescription = `Paciente atualizado: ${normalizedText.name}`;
    if (statusChanged && nextStatus === 'inativo') {
      activityDescription = `Paciente desativado: ${normalizedText.name}`;
    } else if (statusChanged && nextStatus === 'ativo') {
      activityDescription = `Paciente reativado: ${normalizedText.name}`;
    }

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      id_paciente: id,
      tipo: statusChanged
        ? (nextStatus === 'inativo' ? 'Paciente inativado' : 'Paciente reativado')
        : 'Paciente atualizado',
      descricao: activityDescription
    });

    return res.status(200).json({ message: "Paciente atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar paciente:", error);
    return res.status(500).json({ message: "Erro ao atualizar paciente." });
  }
}

export async function updatePatientStatus(req, res) {
  try {
    const { patientTable } = await getPatientSchema();
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de paciente inválido." });
    }

    const statusInformado = String(req.body?.status || "").trim().toLowerCase();
    if (statusInformado !== "ativo" && statusInformado !== "inativo") {
      return res.status(400).json({ message: "Status inválido. Use 'ativo' ou 'inativo'." });
    }

    const [[current]] = await pool.query(
      `SELECT nome AS name, status, oculto FROM ${patientTable} WHERE id = ?`,
      [id]
    );

    if (!current) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    const isOculto = current.oculto === 1 || current.oculto === true;
    if (isOculto) {
      return res.status(400).json({ message: "Paciente ocultado definitivamente da interface." });
    }

    if (current.status === 'arquivado') {
      return res.status(400).json({ message: "Paciente arquivado deve ser recuperado antes de ter seu status alterado." });
    }

    if (current.status === statusInformado) {
      return res.status(200).json({
        message: statusInformado === 'ativo' ? "Paciente já está ativo." : "Paciente já está inativo."
      });
    }

    await pool.query(
      `UPDATE ${patientTable} SET status = ? WHERE id = ?`,
      [statusInformado, id]
    );

    const descricaoAtividade = statusInformado === 'ativo'
      ? `Paciente reativado: ${current.name} (ID: ${id})`
      : `Paciente desativado: ${current.name} (ID: ${id})`;

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      id_paciente: id,
      tipo: statusInformado === 'ativo' ? 'Paciente reativado' : 'Paciente inativado',
      descricao: descricaoAtividade
    });

    return res.status(200).json({
      message: statusInformado === 'ativo'
        ? "Paciente reativado com sucesso!"
        : "Paciente inativado com sucesso!"
    });
  } catch (error) {
    console.error("Erro ao alterar status do paciente:", error);
    return res.status(500).json({ message: "Erro ao alterar status do paciente." });
  }
}

export async function deletePatient(req, res) {
  try {
    const { patientTable } = await getPatientSchema();
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID de paciente inválido." });
    }

    const [[current]] = await pool.query(
      `SELECT nome AS name, status, oculto FROM ${patientTable} WHERE id = ?`,
      [id]
    );

    if (!current) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    // Regra 3: Apenas pacientes inativos podem ser arquivados.
    // Paciente ativo: rejeita. Paciente já arquivado: rejeita. Paciente ocultado: rejeita.
    const isOculto = current.oculto === 1 || current.oculto === true;
    if (current.status !== 'inativo' || isOculto) {
      return res.status(400).json({ message: "Apenas pacientes inativos podem ser arquivados." });
    }

    // Atualiza status para arquivado (NUNCA DELETE físico)
    const [result] = await pool.query(
      `UPDATE ${patientTable} SET status = 'arquivado' WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    await registrarMovimentacao({
      id_usuario: req.user?.id || null,
      id_paciente: id,
      tipo: 'Paciente arquivado',
      descricao: `Paciente arquivado: ${current.name} (ID: ${id})`
    });

    return res.status(200).json({ message: "Paciente arquivado com sucesso." });
  } catch (error) {
    console.error("Erro ao arquivar paciente:", error);
    return res.status(500).json({ message: "Erro ao arquivar paciente." });
  }
}

// Foto do paciente: arquivo WebP otimizado salvo no próprio projeto.
export async function savePatientPhoto(req, res) {
  try {
    const patientId = parsePositiveInt(req.params.id);
    if (!patientId) return res.status(400).json({ message: 'Paciente inválido.' });
    const image = String(req.body?.image || '');
    const match = image.match(/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ message: 'Formato de foto inválido.' });
    const buffer = Buffer.from(match[1], 'base64');
    if (!buffer.length || buffer.length > 300 * 1024) return res.status(400).json({ message: 'A foto otimizada deve ter no máximo 300 KB.' });
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { resolve } = await import('node:path');
    const dir = fileURLToPath(new URL('../../../Frontend/recursos/uploads/pacientes/', import.meta.url));
    await mkdir(dir, { recursive: true });
    const file = resolve(dir, `${patientId}.webp`);
    await writeFile(file, buffer);

    // Só confirma sucesso depois de validar que o arquivo realmente ficou gravado.
    const { stat } = await import('node:fs/promises');
    const saved = await stat(file);
    if (!saved.isFile() || saved.size !== buffer.length) {
      throw new Error('A foto não pôde ser confirmada após a gravação.');
    }

    const photo = `/recursos/uploads/pacientes/${patientId}.webp`;
    return res.json({ message: 'Foto salva com sucesso.', path: photo, photo, bytes: saved.size });
  } catch (error) {
    console.error('Erro ao salvar foto do paciente:', error);
    return res.status(500).json({ message: 'Erro ao salvar foto do paciente.' });
  }
}

export async function deletePatientPhoto(req, res) {
  try {
    const patientId = parsePositiveInt(req.params.id);
    if (!patientId) return res.status(400).json({ message: 'Paciente inválido.' });
    const { unlink } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { resolve } = await import('node:path');
    const dir = fileURLToPath(new URL('../../../Frontend/recursos/uploads/pacientes/', import.meta.url));
    const file = resolve(dir, `${patientId}.webp`);
    await unlink(file).catch((error) => { if (error.code !== 'ENOENT') throw error; });
    return res.json({ message: 'Foto removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover foto do paciente:', error);
    return res.status(500).json({ message: 'Erro ao remover foto do paciente.' });
  }
}
