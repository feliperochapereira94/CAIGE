// =========================================================
// CAIGE - SNAPSHOT DE PRONTUARIO
// =========================================================
// Centraliza a copia imutavel da estrutura usada no lancamento
// e a compatibilidade de leitura entre registros novos e antigos.
// =========================================================

function normalizarJson(valor) {
  if (!valor) return null;
  if (typeof valor === 'object') return valor;

  try {
    return JSON.parse(valor);
  } catch {
    return null;
  }
}

export function criarDadosResposta(perguntas, respostas) {
  return Object.fromEntries(
    perguntas.map((pergunta) => [
      pergunta.id,
      {
        titulo: pergunta.titulo,
        descricao: pergunta.descricao || null,
        tipo_pergunta: pergunta.tipo_pergunta,
        opcoes_snapshot: pergunta.opcoes,
        ordem_pergunta: pergunta.ordem_pergunta,
        disposicao: pergunta.disposicao || 'automatico',
        resposta: respostas[pergunta.id] || null
      }
    ])
  );
}

export function criarSnapshotProntuario({ questionario, perguntas, profissional }) {
  return {
    versao: 2,
    questionario: {
      id: questionario.id,
      titulo: questionario.titulo,
      descricao: questionario.descricao || null,
      id_curso: questionario.id_curso,
      curso_nome: questionario.course_name || null
    },
    perguntas: perguntas.map((pergunta) => ({
      id: pergunta.id,
      titulo: pergunta.titulo,
      descricao: pergunta.descricao || null,
      tipo_pergunta: pergunta.tipo_pergunta,
      opcoes_snapshot: pergunta.opcoes,
      ordem_pergunta: pergunta.ordem_pergunta,
      disposicao: pergunta.disposicao || 'automatico'
    })),
    registro: {
      id_profissional: profissional.id,
      profissional_nome: profissional.name || null
    }
  };
}

export function aplicarSnapshotHistorico(registro) {
  const snapshot = normalizarJson(registro.structure_snapshot);
  const questionario = snapshot?.questionario || {};
  const lancamento = snapshot?.registro || {};
  const idCursoSnapshot = Number(questionario.id_curso);

  return {
    ...registro,
    structure_snapshot: snapshot,
    questionnaire_title: questionario.titulo || registro.questionnaire_title,
    questionnaire_description: questionario.descricao ?? registro.questionnaire_description,
    idCurso:
      Number.isInteger(idCursoSnapshot) && idCursoSnapshot > 0
        ? idCursoSnapshot
        : registro.idCurso,
    course_name: questionario.curso_nome || registro.course_name,
    professional_name: lancamento.profissional_nome || registro.professional_name
  };
}
