// =========================================================
// CAIGE - RENDERIZADOR DE PRONTUÁRIOS
// =========================================================
// Visualização somente leitura de lançamentos já registrados.
// Mantém a apresentação individual e comparativa em uma única fonte.
// =========================================================

(() => {
  function escaparHtml(valor) {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizarDadosResposta(valor) {
    if (!valor) return {};
    if (typeof valor === 'object') return valor;

    try {
      return JSON.parse(valor);
    } catch {
      return {};
    }
  }


  function normalizarSnapshot(valor) {
    if (!valor) return null;
    if (typeof valor === 'object') return valor;

    try {
      return JSON.parse(valor);
    } catch {
      return null;
    }
  }

  function obterPerguntasDoRegistro(registro) {
    const respostas = normalizarDadosResposta(registro?.response_data);
    const snapshot = normalizarSnapshot(registro?.structure_snapshot);
    const perguntasSnapshot = Array.isArray(snapshot?.perguntas)
      ? [...snapshot.perguntas]
      : [];

    if (perguntasSnapshot.length) {
      return perguntasSnapshot
        .sort((a, b) => Number(a.ordem_pergunta || 0) - Number(b.ordem_pergunta || 0))
        .map((pergunta) => {
          const respostaRegistrada = respostas[String(pergunta.id)] || respostas[pergunta.id] || {};

          return {
            ...pergunta,
            resposta: respostaRegistrada.resposta ?? respostaRegistrada.answer ?? null,
            opcoes_snapshot:
              pergunta.opcoes_snapshot ?? respostaRegistrada.opcoes_snapshot ?? respostaRegistrada.options
          };
        });
    }

    return Object.values(respostas)
      .sort((a, b) => Number(a.ordem_pergunta || 0) - Number(b.ordem_pergunta || 0));
  }

  function normalizarOpcoes(valor) {
    if (!valor) return [];

    if (Array.isArray(valor)) {
      return valor.map(String);
    }

    if (typeof valor === 'object') {
      const opcoes = Array.isArray(valor.options) ? valor.options : [];
      return opcoes.map(String);
    }

    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) return parsed.map(String);
      if (Array.isArray(parsed?.options)) return parsed.options.map(String);
    } catch {
      return String(valor)
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  function paraData(valor) {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function formatarDataHora(valor) {
    const data = paraData(valor);
    if (!data) return '-';

    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function obterModeloPergunta(entrada, indice) {
    const tipo = entrada.tipo_pergunta || entrada.question_type || 'texto_livre';
    const respostaBruta = entrada.resposta ?? entrada.answer ?? '';
    const resposta = String(respostaBruta || '');
    const opcoes = tipo === 'sim_nao'
      ? ['Sim', 'Não']
      : tipo === 'escala'
        ? [1, 2, 3, 4, 5]
        : tipo === 'multipla_escolha'
          ? normalizarOpcoes(entrada.opcoes_snapshot ?? entrada.options)
          : [];

    return {
      numero: indice + 1,
      titulo: entrada.titulo || entrada.title || `Pergunta ${indice + 1}`,
      tipo,
      resposta: resposta || 'Não informado',
      opcoes,
      selecionada: tipo === 'escala' ? Number(respostaBruta) : String(respostaBruta ?? ''),
      ampla: tipo === 'texto_livre' || resposta.length > 90
    };
  }

  function obterModeloRegistro(registro, paciente) {
    const rawNomePaciente = paciente?.name || paciente?.nome || 'Paciente';
    const nomePaciente = window.FormatadorTexto
      ? window.FormatadorTexto.formatarNomePessoa(rawNomePaciente)
      : rawNomePaciente;
    const rawProfissional = registro?.professional_name || 'Não identificado';
    const profissional = (window.FormatadorTexto && registro?.professional_name)
      ? window.FormatadorTexto.formatarNomePessoa(rawProfissional)
      : rawProfissional;
    const entradas = obterPerguntasDoRegistro(registro);

    return {
      titulo: registro?.questionnaire_title || 'Prontuário',
      descricao: registro?.questionnaire_description || '',
      paciente: nomePaciente,
      curso: registro?.course_name || 'Curso não identificado',
      profissional,
      dataLancamento: formatarDataHora(registro?.created_at),
      perguntas: entradas.map(obterModeloPergunta)
    };
  }

  function obterModelo(registros, paciente) {
    const lista = Array.isArray(registros) ? registros : [registros];
    return lista.filter(Boolean).map((registro) => obterModeloRegistro(registro, paciente));
  }

  function renderizarOpcao(rotulo, selecionada) {
    return `
      <span class="prontuario-documento__opcao ${selecionada ? 'prontuario-documento__opcao--selecionada' : ''}">
        <span class="prontuario-documento__marcador" aria-hidden="true"></span>
        <span>${escaparHtml(rotulo)}</span>
      </span>
    `;
  }

  function renderizarResposta(entrada) {
    const tipo = entrada.tipo_pergunta || entrada.question_type || 'texto_livre';
    const resposta = entrada.resposta ?? entrada.answer ?? '';

    if (tipo === 'sim_nao') {
      return `
        <div class="prontuario-documento__opcoes">
          ${renderizarOpcao('Sim', String(resposta) === 'Sim')}
          ${renderizarOpcao('Não', String(resposta) === 'Não')}
        </div>
      `;
    }

    if (tipo === 'escala') {
      const selecionada = Number(resposta);
      return `
        <div class="prontuario-documento__escala" aria-label="Resposta em escala de 1 a 5">
          ${[1, 2, 3, 4, 5].map((valor) => `
            <span class="prontuario-documento__escala-item ${selecionada === valor ? 'prontuario-documento__escala-item--selecionado' : ''}">
              ${valor}
            </span>
          `).join('')}
        </div>
      `;
    }

    if (tipo === 'multipla_escolha') {
      const opcoes = normalizarOpcoes(entrada.opcoes_snapshot ?? entrada.options);
      if (opcoes.length) {
        return `
          <div class="prontuario-documento__opcoes">
            ${opcoes.map((opcao) => renderizarOpcao(opcao, String(resposta) === String(opcao))).join('')}
          </div>
        `;
      }
    }

    return `
      <div class="prontuario-documento__resposta-texto">
        ${escaparHtml(String(resposta || 'Não informado'))}
      </div>
    `;
  }

  function renderizarPerguntas(registro) {
    const entradas = obterPerguntasDoRegistro(registro);

    if (!entradas.length) {
      return '<p class="prontuario-documento__vazio">Nenhuma resposta registrada.</p>';
    }

    return entradas.map((entrada, indice) => {
      const tipo = entrada.tipo_pergunta || entrada.question_type || 'texto_livre';
      const resposta = String(entrada.resposta ?? entrada.answer ?? '');
      const disposicao = entrada.disposicao || entrada.layout || 'automatico';
      const ampla = disposicao === 'linha_inteira' ||
        (disposicao === 'automatico' && (tipo === 'texto_livre' || resposta.length > 90));

      return `
        <section class="prontuario-documento__pergunta ${ampla ? 'prontuario-documento__pergunta--larga' : ''}">
          <div class="prontuario-documento__pergunta-cabecalho">
            <span class="prontuario-documento__numero">${String(indice + 1).padStart(2, '0')}</span>
            <div>
              <h3>${escaparHtml(entrada.titulo || entrada.title || `Pergunta ${indice + 1}`)}</h3>
            </div>
          </div>
          ${renderizarResposta(entrada)}
        </section>
      `;
    }).join('');
  }

  function renderizarRegistro(registro, paciente, opcoes = {}) {
    const titulo = registro.questionnaire_title || 'Prontuário';
    const descricao = registro.questionnaire_description || '';
    const rawNomePaciente = paciente?.name || paciente?.nome || 'Paciente';
    const nomePaciente = window.FormatadorTexto ? window.FormatadorTexto.formatarNomePessoa(rawNomePaciente) : rawNomePaciente;
    const rawProfissional = registro.professional_name || 'Não identificado';
    const profissional = (window.FormatadorTexto && registro.professional_name)
      ? window.FormatadorTexto.formatarNomePessoa(rawProfissional)
      : rawProfissional;
    const curso = registro.course_name || 'Curso não identificado';
    const emitidoEm = formatarDataHora(new Date());
    const classeComparacao = opcoes.comparacao ? ' prontuario-documento--comparacao' : '';

    return `
      <article class="prontuario-documento${classeComparacao}">
        <header class="prontuario-documento__cabecalho">
          <div class="prontuario-documento__marca">
            <img class="prontuario-documento__logo"
              src="../../recursos/images/logo-caige.png" alt="" aria-hidden="true">
            <div class="prontuario-documento__marca-texto">
              <strong>CAIGE · UNIVALE</strong>
              <span>Centro de Atendimento Interdisciplinar à Pessoa Idosa</span>
            </div>
          </div>
          <div class="prontuario-documento__titulo">
            <span>Documento clínico</span>
            <h2>${escaparHtml(titulo)}</h2>
            ${descricao ? `<p>${escaparHtml(descricao)}</p>` : ''}
          </div>
        </header>

        <section class="prontuario-documento__identificacao">
          <div>
            <span class="prontuario-documento__rotulo">Paciente</span>
            <strong>${escaparHtml(nomePaciente)}</strong>
          </div>
          <div>
            <span class="prontuario-documento__rotulo">Curso</span>
            <strong>${escaparHtml(curso)}</strong>
          </div>
          <div>
            <span class="prontuario-documento__rotulo">Profissional</span>
            <strong>${escaparHtml(profissional)}</strong>
          </div>
          <div>
            <span class="prontuario-documento__rotulo">Data do lançamento</span>
            <strong>${escaparHtml(formatarDataHora(registro.created_at))}</strong>
          </div>
        </section>

        <section class="prontuario-documento__questionario">
          <h2 class="prontuario-documento__secao-titulo">Perguntas e respostas</h2>
          <div class="prontuario-documento__perguntas">
            ${renderizarPerguntas(registro)}
          </div>
        </section>

        <footer class="prontuario-documento__rodape">
          Documento clínico gerado pelo CAIGE · Emitido em ${escaparHtml(emitidoEm)}
        </footer>
      </article>
    `;
  }

  function renderizar(registros, paciente) {
    const lista = Array.isArray(registros) ? registros : [registros];
    const comparacao = lista.length > 1;

    return lista
      .filter(Boolean)
      .map((registro) => renderizarRegistro(registro, paciente, { comparacao }))
      .join('');
  }

  window.RenderizadorProntuario = Object.freeze({
    renderizar,
    obterModelo
  });
})();
