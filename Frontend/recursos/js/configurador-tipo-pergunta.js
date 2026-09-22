/* Configuração visual dos tipos estruturais de pergunta do CAIGE. */
(function () {
  'use strict';

  function criarOpcaoPreview(rotulo) {
    const label = document.createElement('label');
    label.className = 'configuracao-resposta__opcao';

    const input = document.createElement('input');
    input.type = 'radio';
    input.disabled = true;

    const texto = document.createElement('span');
    texto.textContent = rotulo;

    label.append(input, texto);
    return label;
  }

  function inicializar({ seletorTipo, conteudo }) {
    const select = typeof seletorTipo === 'string'
      ? document.querySelector(seletorTipo)
      : seletorTipo;
    const container = typeof conteudo === 'string'
      ? document.querySelector(conteudo)
      : conteudo;

    if (!select || !container) {
      return null;
    }

    let alternativas = ['', ''];

    function coletarAlternativas() {
      alternativas = Array.from(container.querySelectorAll('[data-alternativa-input]'))
        .map((input) => input.value);
    }

    function renderizarTextoLivre() {
      const textarea = document.createElement('textarea');
      textarea.disabled = true;
      textarea.rows = 2;
      textarea.placeholder = 'O profissional digitará a resposta aqui.';
      textarea.setAttribute('aria-label', 'Prévia de resposta em texto livre');
      container.appendChild(textarea);
    }

    function renderizarOpcoesFixas(opcoes) {
      const lista = document.createElement('div');
      lista.className = 'configuracao-resposta__opcoes';
      opcoes.forEach((opcao) => lista.appendChild(criarOpcaoPreview(opcao)));
      container.appendChild(lista);
    }

    function criarLinhaAlternativa(valor = '') {
      const linha = document.createElement('div');
      linha.className = 'configuracao-resposta__alternativa';

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 255;
      input.placeholder = 'Digite uma alternativa';
      input.value = valor;
      input.dataset.alternativaInput = '';
      input.setAttribute('aria-label', 'Alternativa da pergunta');

      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'configuracao-resposta__remover';
      remover.innerHTML = '<span class="icone icone--xs" data-icone="fechar" aria-hidden="true"></span>';
      window.IconesCAIGE?.aplicar?.(remover);
      remover.title = 'Remover alternativa';
      remover.setAttribute('aria-label', 'Remover alternativa');
      remover.addEventListener('click', () => {
        const linhas = container.querySelectorAll('.configuracao-resposta__alternativa');
        if (linhas.length <= 2) {
          input.value = '';
          input.focus();
          return;
        }
        linha.remove();
        coletarAlternativas();
      });

      linha.append(input, remover);
      return linha;
    }

    function renderizarMultiplaEscolha() {
      const editor = document.createElement('div');
      editor.className = 'configuracao-resposta__alternativas';

      alternativas.forEach((valor) => editor.appendChild(criarLinhaAlternativa(valor)));

      const adicionar = document.createElement('button');
      adicionar.type = 'button';
      adicionar.className = 'btn-alt configuracao-resposta__adicionar';
      adicionar.textContent = '+ Adicionar alternativa';
      adicionar.addEventListener('click', () => {
        const linha = criarLinhaAlternativa('');
        editor.appendChild(linha);
        linha.querySelector('[data-alternativa-input]')?.focus();
        coletarAlternativas();
      });

      editor.addEventListener('input', coletarAlternativas);
      container.append(editor, adicionar);
    }

    function renderizar() {
      if (container.querySelector('[data-alternativa-input]')) {
        coletarAlternativas();
      }

      container.innerHTML = '';

      switch (select.value) {
        case 'multipla_escolha':
          renderizarMultiplaEscolha();
          break;
        case 'sim_nao':
          renderizarOpcoesFixas(['Sim', 'Não']);
          break;
        case 'escala':
          renderizarOpcoesFixas(['1', '2', '3', '4', '5']);
          break;
        default:
          renderizarTextoLivre();
      }
    }

    function obterOpcoes() {
      if (select.value !== 'multipla_escolha') {
        return undefined;
      }

      coletarAlternativas();
      return alternativas.map((item) => item.trim()).filter(Boolean);
    }

    function redefinir() {
      alternativas = ['', ''];
      renderizar();
    }

    select.addEventListener('change', renderizar);
    renderizar();

    return {
      obterOpcoes,
      redefinir,
      renderizar
    };
  }

  window.ConfiguradorTipoPergunta = { inicializar };
})();
