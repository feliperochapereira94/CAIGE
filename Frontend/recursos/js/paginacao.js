// =========================================================
// CAIGE - PAGINAÇÃO REUTILIZÁVEL
// =========================================================
//
// Responsabilidades:
// - quantidade por página;
// - seletor pesquisável no desktop;
// - primeira / anterior / próxima / última;
// - página atual e total de páginas;
// - total de registros;
// - funcionamento reutilizável em qualquer listagem.
//
// Opções padrão:
// 10, 20, 30, 50, 100
//
// O <select> continua sendo a fonte de verdade.
// No desktop ele recebe uma interface pesquisável.
// No mobile permanece nativo.
// =========================================================

class PaginacaoLista {
  static OPCOES_PADRAO = [10, 20, 30, 50, 100];

  constructor(configuracao = {}) {
    this.seletorQuantidade =
      configuracao.seletorQuantidade || null;

    this.seletorPaginacao =
      configuracao.seletorPaginacao || null;

    this.seletorResumo =
      configuracao.seletorResumo || null;

    this.seletorIndicador =
      configuracao.seletorIndicador || null;

    this.seletorPrimeira =
      configuracao.seletorPrimeira || null;

    this.seletorAnterior =
      configuracao.seletorAnterior || null;

    this.seletorProxima =
      configuracao.seletorProxima || null;

    this.seletorUltima =
      configuracao.seletorUltima || null;

    this.seletorScroll =
      configuracao.seletorScroll || null;

    this.tamanhoPadrao =
      Number(configuracao.tamanhoPadrao) || 10;

    this.opcoesQuantidade =
      Array.isArray(configuracao.opcoesQuantidade) &&
      configuracao.opcoesQuantidade.length
        ? configuracao.opcoesQuantidade
            .map(Number)
            .filter(
              (valor) =>
                Number.isFinite(valor) &&
                valor > 0
            )
        : [...PaginacaoLista.OPCOES_PADRAO];

    this.rotuloSingular =
      configuracao.rotuloSingular || 'registro';

    this.rotuloPlural =
      configuracao.rotuloPlural || 'registros';

    this.aoRenderizar =
      typeof configuracao.aoRenderizar === 'function'
        ? configuracao.aoRenderizar
        : () => {};

    this.itens = [];
    this.paginaAtual = 1;
    this.tamanhoPagina = this.tamanhoPadrao;

    this._elementoQuantidade = null;
    this._picker = null;
    this._pickerButton = null;
    this._pickerPanel = null;
    this._pickerSearch = null;
    this._pickerOptions = null;
    this._paginasContainer = null;

    this._normalizarQuantidade();
    this._criarSeletorPesquisavel();
    this._configurarEventos();
  }


  _elemento(seletor) {
    return seletor
      ? document.querySelector(seletor)
      : null;
  }


  _rotuloOpcao(valor) {
    return `${valor} registros por página`;
  }


  _normalizarQuantidade() {
    const quantidade =
      this._elemento(this.seletorQuantidade);

    this._elementoQuantidade =
      quantidade;

    if (!quantidade) {
      return;
    }

    const valorAtual =
      Number(quantidade.value) ||
      this.tamanhoPadrao;

    quantidade.classList.add(
      'pagination-page-size__native'
    );

    quantidade.innerHTML =
      this.opcoesQuantidade
        .map(
          (valor) => `
            <option
              value="${valor}"
              ${valor === valorAtual ? 'selected' : ''}
            >
              ${valor} por página
            </option>
          `
        )
        .join('');

    if (
      !this.opcoesQuantidade.includes(valorAtual)
    ) {
      quantidade.value =
        String(this.tamanhoPadrao);
    }

    this.tamanhoPagina =
      Number(quantidade.value) ||
      this.tamanhoPadrao;
  }


  _criarSeletorPesquisavel() {
    const quantidade =
      this._elementoQuantidade;

    if (
      !quantidade ||
      quantidade.dataset.pickerCriado === 'true'
    ) {
      return;
    }

    quantidade.dataset.pickerCriado = 'true';

    const picker =
      document.createElement('div');

    picker.className =
      'pagination-page-size-picker';

    picker.innerHTML = `
      <button
        class="pagination-page-size-picker__button"
        type="button"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span class="pagination-page-size-picker__value"></span>
        <span
          class="pagination-page-size-picker__chevron"
          aria-hidden="true"
        ></span>
      </button>

      <div
        class="pagination-page-size-picker__panel"
        hidden
      >
        <input
          class="pagination-page-size-picker__search"
          type="search"
          inputmode="numeric"
          autocomplete="off"
          placeholder="Pesquisar quantidade..."
          aria-label="Pesquisar quantidade de registros por página"
        />

        <div
          class="pagination-page-size-picker__options"
          role="listbox"
        ></div>
      </div>
    `;

    quantidade.insertAdjacentElement(
      'afterend',
      picker
    );

    this._picker = picker;

    this._pickerButton =
      picker.querySelector(
        '.pagination-page-size-picker__button'
      );

    this._pickerPanel =
      picker.querySelector(
        '.pagination-page-size-picker__panel'
      );

    this._pickerSearch =
      picker.querySelector(
        '.pagination-page-size-picker__search'
      );

    this._pickerOptions =
      picker.querySelector(
        '.pagination-page-size-picker__options'
      );

    this._renderizarOpcoesQuantidade();
    this._atualizarRotuloQuantidade();
  }


  _atualizarRotuloQuantidade() {
    if (!this._pickerButton) {
      return;
    }

    const valor =
      Number(this._elementoQuantidade?.value) ||
      this.tamanhoPagina;

    const alvo =
      this._pickerButton.querySelector(
        '.pagination-page-size-picker__value'
      );

    if (alvo) {
      alvo.textContent =
        this._rotuloOpcao(valor);
    }
  }


  _renderizarOpcoesQuantidade(filtro = '') {
    if (!this._pickerOptions) {
      return;
    }

    const termo =
      String(filtro || '')
        .trim()
        .toLowerCase();

    const filtradas =
      this.opcoesQuantidade.filter(
        (valor) =>
          this._rotuloOpcao(valor)
            .toLowerCase()
            .includes(termo)
      );

    if (!filtradas.length) {
      this._pickerOptions.innerHTML = `
        <div class="pagination-page-size-picker__empty">
          Nenhuma quantidade encontrada.
        </div>
      `;

      return;
    }

    const selecionado =
      Number(this._elementoQuantidade?.value);

    this._pickerOptions.innerHTML =
      filtradas
        .map(
          (valor) => `
            <button
              class="pagination-page-size-picker__option"
              type="button"
              role="option"
              data-value="${valor}"
              aria-selected="${valor === selecionado}"
            >
              ${this._rotuloOpcao(valor)}
            </button>
          `
        )
        .join('');
  }


  _abrirPicker() {
    if (
      !this._picker ||
      !this._pickerPanel ||
      !this._pickerButton
    ) {
      return;
    }

    this._picker.classList.add(
      'pagination-page-size-picker--open'
    );

    this._pickerPanel.hidden = false;

    // Se não houver espaço suficiente abaixo, abre o painel para cima.
    this._picker.classList.remove('pagination-page-size-picker--above');
    const buttonRect = this._pickerButton.getBoundingClientRect();
    const panelHeight = Math.min(this._pickerPanel.scrollHeight || 270, 270);
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    if (spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow) {
      this._picker.classList.add('pagination-page-size-picker--above');
    }

    this._pickerButton.setAttribute(
      'aria-expanded',
      'true'
    );

    this._pickerSearch.value = '';

    this._renderizarOpcoesQuantidade();

    requestAnimationFrame(() => {
      this._pickerSearch.focus();
    });
  }


  _fecharPicker() {
    if (
      !this._picker ||
      !this._pickerPanel ||
      !this._pickerButton
    ) {
      return;
    }

    this._picker.classList.remove(
      'pagination-page-size-picker--open'
    );
    this._picker.classList.remove(
      'pagination-page-size-picker--above'
    );

    this._pickerPanel.hidden = true;

    this._pickerButton.setAttribute(
      'aria-expanded',
      'false'
    );
  }


  _selecionarQuantidade(valor) {
    const quantidade =
      this._elementoQuantidade;

    if (!quantidade) {
      return;
    }

    quantidade.value =
      String(valor);

    quantidade.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );

    this._atualizarRotuloQuantidade();
    this._renderizarOpcoesQuantidade();
    this._fecharPicker();
  }


  _configurarPicker() {
    if (
      !this._picker ||
      !this._pickerButton
    ) {
      return;
    }

    this._pickerButton.addEventListener(
      'click',
      () => {
        const aberto =
          this._pickerButton.getAttribute(
            'aria-expanded'
          ) === 'true';

        if (aberto) {
          this._fecharPicker();
        } else {
          this._abrirPicker();
        }
      }
    );

    this._pickerSearch?.addEventListener(
      'input',
      () => {
        this._renderizarOpcoesQuantidade(
          this._pickerSearch.value
        );
      }
    );

    this._pickerOptions?.addEventListener(
      'click',
      (evento) => {
        const opcao =
          evento.target.closest(
            '.pagination-page-size-picker__option'
          );

        if (!opcao) {
          return;
        }

        this._selecionarQuantidade(
          Number(opcao.dataset.value)
        );
      }
    );

    document.addEventListener(
      'pointerdown',
      (evento) => {
        if (
          this._picker &&
          !this._picker.contains(evento.target)
        ) {
          this._fecharPicker();
        }
      }
    );

    document.addEventListener(
      'keydown',
      (evento) => {
        if (
          evento.key === 'Escape' &&
          this._pickerButton?.getAttribute(
            'aria-expanded'
          ) === 'true'
        ) {
          this._fecharPicker();
          this._pickerButton.focus();
        }
      }
    );
  }


  _configurarEventos() {
    const quantidade =
      this._elementoQuantidade;

    const primeira =
      this._elemento(this.seletorPrimeira);

    const anterior =
      this._elemento(this.seletorAnterior);

    const proxima =
      this._elemento(this.seletorProxima);

    const ultima =
      this._elemento(this.seletorUltima);

    quantidade?.addEventListener(
      'change',
      () => {
        this.tamanhoPagina =
          Number(quantidade.value) ||
          this.tamanhoPadrao;

        this.paginaAtual = 1;

        this._atualizarRotuloQuantidade();
        this._renderizarOpcoesQuantidade();

        this.renderizar();
        this._resetarScroll();
      }
    );

    this._configurarPicker();

    primeira?.addEventListener(
      'click',
      () => {
        if (this.paginaAtual === 1) {
          return;
        }

        this.paginaAtual = 1;
        this.renderizar();
        this._resetarScroll();
      }
    );

    anterior?.addEventListener(
      'click',
      () => {
        if (this.paginaAtual <= 1) {
          return;
        }

        this.paginaAtual -= 1;
        this.renderizar();
        this._resetarScroll();
      }
    );

    proxima?.addEventListener(
      'click',
      () => {
        const totalPaginas =
          this.obterTotalPaginas();

        if (
          this.paginaAtual >= totalPaginas
        ) {
          return;
        }

        this.paginaAtual += 1;
        this.renderizar();
        this._resetarScroll();
      }
    );

    ultima?.addEventListener(
      'click',
      () => {
        const totalPaginas =
          this.obterTotalPaginas();

        if (
          this.paginaAtual === totalPaginas
        ) {
          return;
        }

        this.paginaAtual =
          totalPaginas;

        this.renderizar();
        this._resetarScroll();
      }
    );
  }


  _garantirPaginasNumericas() {
    const indicador =
      this._elemento(this.seletorIndicador);

    if (!indicador) {
      return null;
    }

    if (
      this._paginasContainer &&
      this._paginasContainer.isConnected
    ) {
      return this._paginasContainer;
    }

    const container =
      document.createElement('div');

    container.className =
      'pagination-numbered-pages';

    container.setAttribute(
      'aria-label',
      'Escolher página'
    );

    indicador.insertAdjacentElement(
      'beforebegin',
      container
    );

    container.addEventListener(
      'click',
      (evento) => {
        const botao =
          evento.target.closest(
            '.pagination-page-number'
          );

        if (!botao || botao.disabled) {
          return;
        }

        const pagina =
          Number(botao.dataset.page);

        if (
          !Number.isFinite(pagina) ||
          pagina < 1 ||
          pagina > this.obterTotalPaginas() ||
          pagina === this.paginaAtual
        ) {
          return;
        }

        this.paginaAtual = pagina;
        this.renderizar();
        this._resetarScroll();
      }
    );

    this._paginasContainer = container;

    return container;
  }


  _paginasVisiveis(totalPaginas) {
    if (totalPaginas <= 7) {
      return Array.from(
        { length: totalPaginas },
        (_, indice) => indice + 1
      );
    }

    const atual = this.paginaAtual;
    const paginas = new Set([
      1,
      totalPaginas,
      atual - 1,
      atual,
      atual + 1
    ]);

    if (atual <= 4) {
      [2, 3, 4, 5].forEach(
        (pagina) => paginas.add(pagina)
      );
    }

    if (atual >= totalPaginas - 3) {
      [
        totalPaginas - 4,
        totalPaginas - 3,
        totalPaginas - 2,
        totalPaginas - 1
      ].forEach(
        (pagina) => paginas.add(pagina)
      );
    }

    const ordenadas =
      [...paginas]
        .filter(
          (pagina) =>
            pagina >= 1 &&
            pagina <= totalPaginas
        )
        .sort((a, b) => a - b);

    const resultado = [];

    ordenadas.forEach(
      (pagina, indice) => {
        const anterior =
          ordenadas[indice - 1];

        if (
          indice > 0 &&
          pagina - anterior > 1
        ) {
          resultado.push('...');
        }

        resultado.push(pagina);
      }
    );

    return resultado;
  }


  _renderizarPaginasNumericas(totalPaginas) {
    const container =
      this._garantirPaginasNumericas();

    if (!container) {
      return;
    }

    container.innerHTML =
      this._paginasVisiveis(totalPaginas)
        .map((pagina) => {
          if (pagina === '...') {
            return `
              <span
                class="pagination-page-ellipsis"
                aria-hidden="true"
              >…</span>
            `;
          }

          const atual =
            pagina === this.paginaAtual;

          return `
            <button
              class="pagination-page-number${atual ? ' is-active' : ''}"
              type="button"
              data-page="${pagina}"
              ${atual ? 'aria-current="page"' : ''}
              aria-label="Página ${pagina}"
            >
              ${pagina}
            </button>
          `;
        })
        .join('');
  }


  _resetarScroll() {
    const paginacao =
      this._elemento(this.seletorPaginacao);

    const scrollContainer =
      this.seletorScroll
        ? this._elemento(this.seletorScroll)
        : paginacao
            ?.closest(
              '.admin-list, .list-shell, .card'
            )
            ?.querySelector(
              '.admin-list__body, .list-shell__body, .table-wrap, .data-grid__body, .data-grid'
            );

    if (
      scrollContainer &&
      typeof scrollContainer.scrollTop === 'number'
    ) {
      scrollContainer.scrollTop = 0;
    }
  }


  definirItens(
    itens = [],
    manterPagina = false
  ) {
    this.itens =
      Array.isArray(itens)
        ? [...itens]
        : [];

    if (!manterPagina) {
      this.paginaAtual = 1;
    }

    this.renderizar();
  }


  obterTotalPaginas() {
    return Math.max(
      1,
      Math.ceil(
        this.itens.length /
        this.tamanhoPagina
      )
    );
  }


  obterItensDaPagina() {
    const totalPaginas =
      this.obterTotalPaginas();

    this.paginaAtual =
      Math.min(
        Math.max(
          1,
          this.paginaAtual
        ),
        totalPaginas
      );

    const inicio =
      (this.paginaAtual - 1) *
      this.tamanhoPagina;

    return this.itens.slice(
      inicio,
      inicio + this.tamanhoPagina
    );
  }


  _textoQuantidade(total) {
    const rotulo =
      total === 1
        ? this.rotuloSingular
        : this.rotuloPlural;

    return `${total} ${rotulo}`;
  }


  renderizar() {
    const paginacao =
      this._elemento(this.seletorPaginacao);

    const resumo =
      this._elemento(this.seletorResumo);

    const indicador =
      this._elemento(this.seletorIndicador);

    const primeira =
      this._elemento(this.seletorPrimeira);

    const anterior =
      this._elemento(this.seletorAnterior);

    const proxima =
      this._elemento(this.seletorProxima);

    const ultima =
      this._elemento(this.seletorUltima);

    const total =
      this.itens.length;

    const totalPaginas =
      this.obterTotalPaginas();

    const itensPagina =
      this.obterItensDaPagina();

    this.aoRenderizar(
      itensPagina,
      {
        total,
        paginaAtual: this.paginaAtual,
        totalPaginas,
        tamanhoPagina: this.tamanhoPagina
      }
    );

    const textoQuantidade =
      this._textoQuantidade(total);

    if (resumo) {
      resumo.textContent =
        textoQuantidade;
    }

    if (indicador) {
      if (total === 0) {
        indicador.textContent = '0 registros';
      } else {
        const inicio =
          (this.paginaAtual - 1) *
          this.tamanhoPagina;

        const fim =
          Math.min(
            inicio + this.tamanhoPagina,
            total
          );

        const registroInicio =
          inicio + 1;

        indicador.textContent =
          `${registroInicio}–${fim} de ${total}`;
      }
    }

    this._renderizarPaginasNumericas(
      totalPaginas
    );

    const naPrimeira =
      total === 0 ||
      this.paginaAtual <= 1;

    const naUltima =
      total === 0 ||
      this.paginaAtual >= totalPaginas;

    if (primeira) {
      primeira.disabled = naPrimeira;
    }

    if (anterior) {
      anterior.disabled = naPrimeira;
    }

    if (proxima) {
      proxima.disabled = naUltima;
    }

    if (ultima) {
      ultima.disabled = naUltima;
    }

    if (paginacao) {
      paginacao.hidden = total === 0;
    }
  }
}

window.PaginacaoLista = PaginacaoLista;
