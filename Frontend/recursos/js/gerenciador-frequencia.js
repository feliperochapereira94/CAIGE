// Gerenciador de Frequência - Registro de Presença
class GerenciadorFrequencia {
  constructor() {
    this.usuario = null;
    this.pacientes = [];
    this.cursos = [];
    this.atividades = [];
    this.professores = [];
    this.API_BASE = '/api';

    // Estado do combobox pesquisável de pacientes
    this.pacientesSelecionados = new Map(); // id -> { id, nome }
    this.comboboxAberto = false;
    this.paginaAtual = 1;
    this.limitePorPagina = 5;
    this.temMaisPaginas = true;
    this.carregandoPacientes = false;
    this.termoPesquisaAtual = '';
    this.pacientesCarregados = [];
    this.pacientesIds = new Set();
    this.timerDebounce = null;

    this.init();
  }

  async init() {
    try {
      // Obter dados do usuário do JWT
      this.usuario = UtilJWT.obterUsuario();
      if (!this.usuario) {
        window.location.href = '../../paginas/autenticacao/entrar.html';
        return;
      }

      // Configurar combobox pesquisável de paciente (carregamento sob demanda)
      this.configurarComboboxPaciente();

      // Carregar contexto de frequência (cursos e professores autorizados para o perfil)
      await this.carregarContextoFrequencia();

      this.setupFormulario();
      this.configurarRolagemAssistidaFormulario();
      await this.aplicarControleAcesso();

      // Restaura o trabalho não concluído enquanto a guia interna Frequência existir.
      await this.restaurarEstadoTrabalho();
      this.restaurarEstadoPainelRegistro();
    } catch (error) {
      console.error('Erro ao inicializar frequência:', error);
      notify.error('Erro ao inicializar formulário');
    }
  }

  restaurarEstadoPainelRegistro() {
    let estado = null;
    try {
      const saved = sessionStorage.getItem('caige:frequencia:painel-registro:guia-interna');
      estado = saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem('caige:frequencia:painel-registro:guia-interna');
    }
    const toggle = document.getElementById('attendance-panel-toggle');
    if (!estado || !toggle) return;

    const deveAbrir = estado.aberto === true;
    const estaAberto = toggle.getAttribute('aria-expanded') === 'true';
    if (deveAbrir !== estaAberto) {
      toggle.click();
    }
  }

  salvarEstadoPainelRegistro() {
    const toggle = document.getElementById('attendance-panel-toggle');
    if (!toggle) return;

    try {
      sessionStorage.setItem(
        'caige:frequencia:painel-registro:guia-interna',
        JSON.stringify({ aberto: toggle.getAttribute('aria-expanded') === 'true' })
      );
    } catch (erro) {
      console.warn('Não foi possível salvar o estado do painel de frequência:', erro);
    }
  }

  obterHeaders(incluirJson = false) {
    const headersBase = incluirJson
      ? { 'Content-Type': 'application/json' }
      : {};

    return window.UtilJWT
      ? UtilJWT.obterHeaders(headersBase)
      : headersBase;
  }

  obterPapelUsuario() {
    return String(this.usuario?.papel || this.usuario?.role || '').toUpperCase();
  }

  obterIdCursoUsuario() {
    return this.usuario?.idCurso ?? this.usuario?.id_curso ?? null;
  }

  obterIdUsuario() {
    return this.usuario?.idUsuario ?? this.usuario?.id ?? null;
  }

  obterMargensViewport() {
    const cabecalho = document.querySelector('.content__header, .page-header, .dashboard-header');
    const menuInferior = document.querySelector('.mobile-bottom-nav');
    const alturaCabecalho = cabecalho ? cabecalho.getBoundingClientRect().height : 0;
    const alturaMenuInferior = menuInferior && getComputedStyle(menuInferior).position === 'fixed'
      ? menuInferior.getBoundingClientRect().height
      : 0;

    return {
      superior: Math.max(16, alturaCabecalho + 12),
      inferior: Math.max(20, alturaMenuInferior + 16)
    };
  }

  obterContainerRolagemPrincipal() {
    const conteudo = document.querySelector('.content, .activities-content, .app-content');

    if (conteudo) {
      const estilo = window.getComputedStyle(conteudo);
      const overflowY = estilo.overflowY;
      const permiteRolagem = ['auto', 'scroll', 'overlay'].includes(overflowY);

      if (permiteRolagem && conteudo.scrollHeight > conteudo.clientHeight + 2) {
        return conteudo;
      }
    }

    return document.scrollingElement || document.documentElement;
  }

  rolarParaElementoSeNecessario(elemento, opcoes = {}) {
    if (!elemento) return;

    requestAnimationFrame(() => {
      const container = this.obterContainerRolagemPrincipal();
      const elementoRect = elemento.getBoundingClientRect();
      const margens = this.obterMargensViewport();
      const margemSuperior = opcoes.margemSuperior ?? margens.superior;
      const margemInferior = opcoes.margemInferior ?? margens.inferior;
      const ehDocumento = container === document.scrollingElement ||
        container === document.documentElement ||
        container === document.body;

      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const containerRect = ehDocumento
        ? { top: 0, bottom: viewportHeight }
        : container.getBoundingClientRect();
      const limiteSuperior = containerRect.top + margemSuperior;
      const limiteInferior = containerRect.bottom - margemInferior;
      let deslocamento = 0;

      if (opcoes.alinharAoTopo) {
        if (elementoRect.top < limiteSuperior || elementoRect.bottom > limiteInferior) {
          deslocamento = elementoRect.top - limiteSuperior;
        }
      } else if (elementoRect.bottom > limiteInferior) {
        deslocamento = elementoRect.bottom - limiteInferior;
      } else if (elementoRect.top < limiteSuperior) {
        deslocamento = elementoRect.top - limiteSuperior;
      }

      if (Math.abs(deslocamento) <= 2) return;

      if (ehDocumento) {
        window.scrollBy({
          top: deslocamento,
          behavior: 'smooth'
        });
      } else {
        container.scrollBy({
          top: deslocamento,
          behavior: 'smooth'
        });
      }
    });
  }

  configurarRolagemAssistidaFormulario() {
    const painel = document.getElementById('attendance-panel');
    const toggle = document.getElementById('attendance-panel-toggle');
    const cabecalho = painel?.querySelector('[data-painel-retratil-header]');
    const form = document.getElementById('attendance-form');
    const conteudoPainel = document.getElementById('attendance-panel-content');

    if (!painel || !toggle || !form) return;

    const rolarPainelExpandido = () => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (!window.matchMedia('(max-width: 767px)').matches) return;

      // Em telas pequenas, mantém o início do formulário acessível.
      // Desktop não é reposicionado artificialmente ao expandir.
      this.rolarParaElementoSeNecessario(painel, {
        alinharAoTopo: true,
        margemSuperior: 12
      });
    };

    const ajustarAposExpandir = () => {
      // Uma tentativa logo após a abertura e outra ao fim da animação
      // garantem o comportamento tanto no mobile quanto no desktop,
      // onde .content é o elemento que realmente possui a rolagem.
      window.setTimeout(rolarPainelExpandido, 40);
      window.setTimeout(rolarPainelExpandido, 260);
    };

    toggle.addEventListener('click', ajustarAposExpandir);
    toggle.addEventListener('click', () => {
      window.setTimeout(() => this.salvarEstadoPainelRegistro(), 0);
    });

    if (conteudoPainel) {
      conteudoPainel.addEventListener('transitionend', (evento) => {
        if (evento.propertyName === 'grid-template-rows') {
          rolarPainelExpandido();
        }
      });
    }

    if (cabecalho && cabecalho !== toggle) {
      cabecalho.addEventListener('click', (evento) => {
        if (evento.target.closest('a, button, input, select, textarea, [role="button"]')) return;
        ajustarAposExpandir();
      });
    }

    const camposPrincipais = [
      document.getElementById('attendance-patient-trigger'),
      document.getElementById('attendance-course'),
      document.getElementById('attendance-activity'),
      document.getElementById('attendance-professional')
    ].filter(Boolean);

    camposPrincipais.forEach((campo) => {
      const garantirVisibilidade = () => {
        window.setTimeout(() => this.rolarParaElementoSeNecessario(campo), 30);
      };

      campo.addEventListener('focus', garantirVisibilidade);
      campo.addEventListener('click', garantirVisibilidade);
    });
  }

  /* =========================================================
     COMBOBOX PESQUISÁVEL E PAGINADO DE PACIENTES
     ========================================================= */

  configurarComboboxPaciente() {
    const combobox = document.getElementById('attendance-patient-combobox');
    const trigger = document.getElementById('attendance-patient-trigger');
    const dropdown = document.getElementById('attendance-patient-dropdown');
    const searchInput = document.getElementById('attendance-patient-search');
    const resultsList = document.getElementById('attendance-patient-results');

    if (!combobox || !trigger || !dropdown || !searchInput || !resultsList) {
      return;
    }

    // 1. Abrir/fechar via clique no gatilho
    trigger.addEventListener('click', (evento) => {
      evento.stopPropagation();
      if (this.comboboxAberto) {
        this.fecharDropdownPaciente(true);
      } else {
        this.abrirDropdownPaciente();
      }
    });

    // Abrir via teclado no gatilho (ArrowDown / ArrowUp)
    trigger.addEventListener('keydown', (evento) => {
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        evento.preventDefault();
        if (!this.comboboxAberto) {
          this.abrirDropdownPaciente();
        }
      }
    });

    // 2. Teclado no campo de busca interno
    searchInput.addEventListener('keydown', (evento) => {
      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        const firstItem = resultsList.querySelector('.attendance-patient-item');
        if (firstItem) {
          firstItem.focus();
        }
      } else if (evento.key === 'Enter') {
        evento.preventDefault();
        const itemAtivo =
          resultsList.querySelector('.attendance-patient-item[aria-selected="true"]') ||
          resultsList.querySelector('.attendance-patient-item');
        if (itemAtivo) {
          itemAtivo.click();
        }
      } else if (evento.key === 'Tab') {
        this.fecharDropdownPaciente(false);
      }
    });

    // 3. Teclado na lista de pacientes
    resultsList.addEventListener('keydown', (evento) => {
      const items = Array.from(resultsList.querySelectorAll('.attendance-patient-item'));
      const currentIndex = items.indexOf(document.activeElement);

      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        const nextIndex = currentIndex + 1 < items.length ? currentIndex + 1 : 0;
        if (items[nextIndex]) {
          items[nextIndex].focus();
        }
      } else if (evento.key === 'ArrowUp') {
        evento.preventDefault();
        if (currentIndex <= 0) {
          searchInput.focus();
        } else {
          items[currentIndex - 1].focus();
        }
      } else if (evento.key === 'Tab') {
        this.fecharDropdownPaciente(false);
      }
    });

    // 4. Busca interna com debounce (300ms)
    searchInput.addEventListener('input', () => {
      clearTimeout(this.timerDebounce);
      this.timerDebounce = setTimeout(() => {
        const termo = searchInput.value.trim();
        this.termoPesquisaAtual = termo;
        this.paginaAtual = 1;
        this.temMaisPaginas = true;
        this.buscarPacientesBackend(true);
      }, 300);
    });

    // 5. Rolagem infinita na lista do dropdown
    resultsList.addEventListener('scroll', () => {
      const threshold = 40;
      const nearBottom =
        resultsList.scrollTop + resultsList.clientHeight >=
        resultsList.scrollHeight - threshold;

      if (nearBottom && !this.carregandoPacientes && this.temMaisPaginas) {
        this.paginaAtual += 1;
        this.buscarPacientesBackend(false);
      }
    });

    // 6. Fechar ao clicar fora
    document.addEventListener('click', (evento) => {
      if (!this.comboboxAberto) return;
      if (!combobox.contains(evento.target)) {
        this.fecharDropdownPaciente(false);
      }
    });

    // 7. Fechar com tecla ESC
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && this.comboboxAberto) {
        this.fecharDropdownPaciente(true);
      }
    });
  }

  ajustarDirecaoDropdownPaciente() {
    const combobox = document.getElementById('attendance-patient-combobox');
    const dropdown = document.getElementById('attendance-patient-dropdown');
    const trigger = document.getElementById('attendance-patient-trigger');
    if (!combobox || !dropdown || !trigger || dropdown.hidden) return;

    // No mobile o fluxo vertical continua natural. No desktop o dropdown
    // escolhe automaticamente cima/baixo sem reposicionar a página.
    if (window.matchMedia('(max-width: 767px)').matches) {
      combobox.classList.remove('drop-up');
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const altura = Math.min(dropdown.scrollHeight || 290, 420);
    const margem = 12;
    const espacoAbaixo = window.innerHeight - triggerRect.bottom - margem;
    const espacoAcima = triggerRect.top - margem;

    combobox.classList.toggle(
      'drop-up',
      espacoAbaixo < altura + 6 && espacoAcima > espacoAbaixo
    );
  }

  async abrirDropdownPaciente() {
    const dropdown = document.getElementById('attendance-patient-dropdown');
    const trigger = document.getElementById('attendance-patient-trigger');
    const combobox = document.getElementById('attendance-patient-combobox');
    const searchInput = document.getElementById('attendance-patient-search');

    if (!dropdown || !trigger || !combobox) return;

    this.comboboxAberto = true;
    dropdown.hidden = false;
    combobox.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.remove('is-invalid');

    // Focar no campo de busca interno
    if (searchInput) {
      searchInput.value = '';
      this.termoPesquisaAtual = '';
      requestAnimationFrame(() => {
        searchInput.focus();
      });
    }

    // Carregar primeira página se ainda não carregou ou se reabriu sem busca
    if (this.pacientesCarregados.length === 0) {
      this.paginaAtual = 1;
      this.temMaisPaginas = true;
      await this.buscarPacientesBackend(true);
    } else {
      this.atualizarSelecaoVisualItens();
    }

    // Desktop: posicionamento inteligente (baixo/cima) sem forçar scroll.
    // Mobile: mantém rolagem assistida apenas quando necessária.
    window.setTimeout(() => {
      this.ajustarDirecaoDropdownPaciente();
      if (window.matchMedia('(max-width: 767px)').matches) {
        this.rolarParaElementoSeNecessario(dropdown);
      }
    }, 40);
  }

  fecharDropdownPaciente(devolverFoco = true) {
    if (!this.comboboxAberto) return;

    const dropdown = document.getElementById('attendance-patient-dropdown');
    const trigger = document.getElementById('attendance-patient-trigger');
    const combobox = document.getElementById('attendance-patient-combobox');
    const searchInput = document.getElementById('attendance-patient-search');

    if (dropdown) dropdown.hidden = true;
    if (combobox) combobox.classList.remove('is-open');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      if (devolverFoco) {
        trigger.focus();
      }
    }

    this.comboboxAberto = false;

    // Se fechou sem paciente válido selecionado
    if (this.pacientesSelecionados.size === 0) {
      if (trigger) {
        trigger.classList.add('is-invalid');
      }
      if (this.termoPesquisaAtual || (searchInput && searchInput.value.trim())) {
        window.notify?.warning('Selecione um paciente na lista para prosseguir.');
      }
      this.sincronizarEstadoCamposDependentes();
    }

    // Se a busca estiver vazia mas houver busca anterior, restaurar estado inicial
    if (searchInput && !searchInput.value.trim() && this.termoPesquisaAtual) {
      this.termoPesquisaAtual = '';
      this.paginaAtual = 1;
      this.temMaisPaginas = true;
      this.pacientesCarregados = [];
      this.pacientesIds.clear();
    }
  }

  async buscarPacientesBackend(reset = false) {
    if (this.carregandoPacientes) return;
    if (!reset && !this.temMaisPaginas) return;

    this.carregandoPacientes = true;

    const loadingEl = document.getElementById('attendance-patient-loading');
    const emptyEl = document.getElementById('attendance-patient-empty');
    const resultsList = document.getElementById('attendance-patient-results');

    if (loadingEl) loadingEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;

    if (reset) {
      this.paginaAtual = 1;
      this.pacientesCarregados = [];
      this.pacientesIds.clear();
      if (resultsList) resultsList.innerHTML = '';
    }

    try {
      const params = new URLSearchParams({
        status: 'ativo',
        limit: String(this.limitePorPagina),
        page: String(this.paginaAtual)
      });

      if (this.termoPesquisaAtual) {
        params.set('q', this.termoPesquisaAtual);
      }

      const response = await fetch(`${this.API_BASE}/pacientes?${params.toString()}`, {
        headers: this.obterHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const pacientes = Array.isArray(data) ? data : (data.pacientes || data.data || []);

        if (pacientes.length < this.limitePorPagina) {
          this.temMaisPaginas = false;
        }

        const novosFiltrados = [];
        for (const paciente of pacientes) {
          const id = Number(paciente.id);
          if (!this.pacientesIds.has(id)) {
            this.pacientesIds.add(id);
            novosFiltrados.push(paciente);
          }
        }

        this.pacientesCarregados.push(...novosFiltrados);
        this.renderizarPacientes(novosFiltrados, !reset);

        if (this.pacientesCarregados.length === 0 && emptyEl) {
          emptyEl.hidden = false;
        }
      } else {
        console.error('Erro ao buscar pacientes:', response.status);
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      this.carregandoPacientes = false;
      if (loadingEl) loadingEl.hidden = true;
    }
  }

  renderizarPacientes(novosPacientes, anexar = false) {
    const resultsList = document.getElementById('attendance-patient-results');
    if (!resultsList) return;

    if (!anexar) resultsList.innerHTML = '';

    const nomePaciente = (paciente) => {
      const raw = String(paciente.name || paciente.nome || '').trim();
      return window.FormatadorTexto ? window.FormatadorTexto.formatarNomePessoa(raw) : raw;
    };

    novosPacientes.forEach((paciente) => {
      const nome = nomePaciente(paciente);
      const id = String(paciente.id);
      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = 'attendance-patient-item search-result-item';
      itemBtn.setAttribute('role', 'option');
      itemBtn.dataset.id = id;
      itemBtn.dataset.name = nome;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'attendance-patient-item__checkbox';
      checkbox.tabIndex = -1;
      checkbox.setAttribute('aria-hidden', 'true');

      const nomeEl = document.createElement('span');
      nomeEl.className = 'attendance-patient-item__name';
      nomeEl.textContent = nome;

      itemBtn.append(checkbox, nomeEl);
      itemBtn.addEventListener('click', () => this.togglePaciente(id, nome));
      resultsList.appendChild(itemBtn);
    });

    this.renderizarCabecalhosSelecao();
    this.atualizarSelecaoVisualItens();
  }

  renderizarCabecalhosSelecao() {
    const dropdown = document.getElementById('attendance-patient-dropdown');
    const resultsList = document.getElementById('attendance-patient-results');
    if (!dropdown || !resultsList) return;

    let header = dropdown.querySelector('.attendance-patient-section-header--acoes');
    if (!header) {
      header = document.createElement('div');
      header.className = 'attendance-patient-section-header attendance-patient-section-header--acoes';
      header.innerHTML = `
        <div class="attendance-patient-section-actions" aria-label="Ações da seleção de pacientes">
          <button type="button" class="attendance-patient-section-action" data-action="selecionar-todos">Selecionar todos</button>
          <button type="button" class="attendance-patient-section-action attendance-patient-section-action--secondary" data-action="limpar-todos">Limpar seleção</button>
        </div>`;
      resultsList.before(header);
      header.querySelector('[data-action="selecionar-todos"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.selecionarTodosDisponiveis();
      });
      header.querySelector('[data-action="limpar-todos"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.limparSelecaoPacientes(false);
      });
    }
  }

  atualizarSelecaoVisualItens() {
    const resultsList = document.getElementById('attendance-patient-results');
    if (!resultsList) return;
    resultsList.querySelectorAll('.attendance-patient-item').forEach((item) => {
      const selecionado = this.pacientesSelecionados.has(String(item.dataset.id));
      item.setAttribute('aria-selected', selecionado ? 'true' : 'false');
      const checkbox = item.querySelector('.attendance-patient-item__checkbox');
      if (checkbox) checkbox.checked = selecionado;
    });
    this.atualizarResumoSelecao();
  }

  togglePaciente(id, nome) {
    const chave = String(id);
    if (this.pacientesSelecionados.has(chave)) {
      this.pacientesSelecionados.delete(chave);
    } else {
      this.pacientesSelecionados.set(chave, { id: Number(id), nome });
    }
    this.atualizarSelecaoVisualItens();
    this.salvarEstadoTrabalho();
    this.sincronizarEstadoCamposDependentes();
  }

  async selecionarTodosDisponiveis() {
    const botao = document.querySelector('[data-action="selecionar-todos"]');
    if (botao) botao.disabled = true;

    try {
      let pagina = 1;
      const limite = 100;
      let totalRecebido = 0;

      do {
        const params = new URLSearchParams({
          status: 'ativo',
          limit: String(limite),
          page: String(pagina)
        });

        // "Selecionar todos" respeita a pesquisa atual do seletor.
        if (this.termoPesquisaAtual) params.set('q', this.termoPesquisaAtual);

        const response = await fetch(`${this.API_BASE}/pacientes?${params.toString()}`, {
          headers: this.obterHeaders()
        });

        if (!response.ok) throw new Error('Não foi possível carregar todos os pacientes');

        const data = await response.json();
        const pacientes = Array.isArray(data) ? data : (data.pacientes || data.data || []);
        totalRecebido = pacientes.length;

        for (const paciente of pacientes) {
          const id = Number(paciente.id);
          if (!id) continue;
          const raw = String(paciente.name || paciente.nome || '').trim();
          const nome = window.FormatadorTexto ? window.FormatadorTexto.formatarNomePessoa(raw) : raw;
          this.pacientesSelecionados.set(String(id), { id, nome });
        }

        pagina += 1;
      } while (totalRecebido === limite);

      this.atualizarSelecaoVisualItens();
      this.salvarEstadoTrabalho();
      this.sincronizarEstadoCamposDependentes();
    } catch (error) {
      console.error('Erro ao selecionar todos os pacientes:', error);
      window.notify?.error('Não foi possível selecionar todos os pacientes.');
    } finally {
      if (botao) botao.disabled = false;
    }
  }

  atualizarResumoSelecao() {
    const displayText = document.getElementById('attendance-patient-display');
    const trigger = document.getElementById('attendance-patient-trigger');
    const hiddenInput = document.getElementById('attendance-patient');
    const total = this.pacientesSelecionados.size;
    if (displayText) displayText.textContent = total ? `${total} paciente${total > 1 ? 's' : ''} selecionado${total > 1 ? 's' : ''}` : 'Selecione um ou mais pacientes';
    if (trigger) {
      trigger.classList.toggle('has-selected', total > 0);
      if (total) trigger.classList.remove('is-invalid');
    }
    if (hiddenInput) hiddenInput.value = total ? Array.from(this.pacientesSelecionados.keys()).join(',') : '';
  }

  limparSelecaoPacientes(removerEstado = true) {
    this.pacientesSelecionados.clear();
    this.atualizarSelecaoVisualItens();
    if (removerEstado) {
      sessionStorage.removeItem('caige:frequencia:registro:guia-interna');
    }
    this.sincronizarEstadoCamposDependentes();
  }

  limparSelecaoPaciente() { this.limparSelecaoPacientes(); }

  salvarEstadoTrabalho() {
    const estado = {
      pacientes: Array.from(this.pacientesSelecionados.values()),
      curso: document.getElementById('attendance-course')?.value || '',
      atividade: document.getElementById('attendance-activity')?.value || '',
      profissional: document.getElementById('attendance-professional')?.value || '',
      observacao: document.getElementById('attendance-notes')?.value || ''
    };

    try {
      sessionStorage.setItem(
        'caige:frequencia:registro:guia-interna',
        JSON.stringify(estado)
      );
    } catch (erro) {
      console.warn('Não foi possível salvar o estado do registro de frequência:', erro);
    }
  }

  async restaurarEstadoTrabalho() {
    let estado = null;
    try {
      const saved = sessionStorage.getItem('caige:frequencia:registro:guia-interna');
      estado = saved ? JSON.parse(saved) : null;
    } catch {
      sessionStorage.removeItem('caige:frequencia:registro:guia-interna');
    }

    if (!estado) return;

    const pacientes = Array.isArray(estado.pacientes) ? estado.pacientes : [];
    pacientes.forEach((paciente) => {
      const id = Number(paciente?.id);
      if (id > 0) this.pacientesSelecionados.set(String(id), { id, nome: String(paciente?.nome || '') });
    });

    const curso = document.getElementById('attendance-course');
    const atividade = document.getElementById('attendance-activity');
    const profissional = document.getElementById('attendance-professional');
    const observacao = document.getElementById('attendance-notes');

    if (curso && estado.curso) {
      curso.value = String(estado.curso);
      await this.carregarAtividades(estado.curso);
      this.atualizarSelectProfessores(estado.curso);
    }
    if (atividade && estado.atividade) atividade.value = String(estado.atividade);
    if (profissional && estado.profissional) {
      profissional.value = String(estado.profissional);
    }
    if (observacao) observacao.value = String(estado.observacao || '');

    this.atualizarResumoSelecao();
    this.atualizarSelecaoVisualItens();
    this.sincronizarEstadoCamposDependentes();

    // Mantém o estado restaurado coerente após os selects dependentes serem reconstruídos.
    this.salvarEstadoTrabalho();
  }

  async carregarContextoFrequencia() {
    try {
      const response = await fetch(`${this.API_BASE}/frequencia/contexto`, { headers: this.obterHeaders() });
      if (response.ok) {
        const data = await response.json();
        this.cursos = Array.isArray(data.cursos) ? data.cursos : [];
        this.professores = Array.isArray(data.professores) ? data.professores : [];
        this.atualizarSelectCursos();
      } else {
        console.error('Erro ao carregar contexto de frequência:', response.status);
      }
    } catch (error) {
      console.error('Erro ao carregar contexto de frequência:', error);
    }
  }

  async carregarAtividades(idCurso) {
    if (!idCurso) {
      this.atividades = [];
      this.atualizarSelectAtividades();
      return;
    }

    try {
      const response = await fetch(`${this.API_BASE}/atividades-atendimento/curso/${idCurso}`, {
        headers: this.obterHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        this.atividades = Array.isArray(data) ? data : (data.atividades || []);
      } else {
        this.atividades = [];
      }
    } catch (error) {
      console.error('Erro ao carregar atividades do curso:', error);
      this.atividades = [];
    }

    this.atualizarSelectAtividades();
  }

  escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[caractere]));
  }

  atualizarSelectCursos() {
    const select = document.getElementById('attendance-course');
    if (!select) return;

    // Se for professor, mostrar apenas seu curso
    if (this.obterPapelUsuario() === 'PROFESSOR') {
      select.innerHTML = '';
      const idCursoUsuario = Number(this.obterIdCursoUsuario());
      const cursoDoProf = this.cursos.find((curso) => Number(curso.id) === idCursoUsuario);
      if (cursoDoProf) {
        const option = document.createElement('option');
        option.value = cursoDoProf.id;
        option.textContent = cursoDoProf.nome || cursoDoProf.name;
        select.appendChild(option);
      }
    } else {
      // Se for supervisor, mostrar todos os cursos
      select.innerHTML = '<option value="">Selecione um curso</option>';
      this.cursos.forEach(curso => {
      const isActive = curso.ativo !== undefined ? curso.ativo : (curso.is_active !== false && curso.is_active !== 0);
        if (isActive) {
          const option = document.createElement('option');
          option.value = curso.id;
          option.textContent = curso.nome || curso.name;
          select.appendChild(option);
        }
      });
    }
  }

  atualizarSelectAtividades() {
    const select = document.getElementById('attendance-activity');
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma atividade</option>';
    this.atividades.forEach(atividade => {
      // Aceitar ambas as estruturas (ativo ou is_active)
      const isActive = atividade.is_active !== undefined ? atividade.is_active : (atividade.ativo !== false && atividade.ativo !== 0);
      if (isActive) {
        const option = document.createElement('option');
        option.value = atividade.id;
        option.textContent = atividade.nome || atividade.name;
        select.appendChild(option);
      }
    });

    select.disabled = this.atividades.length === 0;
  }

  atualizarSelectProfessores(idCurso = null) {
    const select = document.getElementById('attendance-professional');
    if (!select) return;

    const cursoSelecionado = Number(
      idCurso || document.getElementById('attendance-course')?.value || 0
    );

    if (!cursoSelecionado) {
      select.innerHTML = '<option value="">Selecione um curso primeiro</option>';
      select.disabled = true;
      this.atualizarEstadoBotaoRegistrar();
      return;
    }

    const profissionaisDoCurso = this.professores.filter((profissional) => {
      const idCursoProfissional =
        profissional.idCurso ??
        profissional.id_curso ??
        profissional.cursoId ??
        profissional.curso_id ??
        null;

      return Number(idCursoProfissional) === cursoSelecionado;
    });

    if (!profissionaisDoCurso.length) {
      select.innerHTML = '<option value="">Nenhum profissional vinculado ao curso</option>';
      select.disabled = true;
      this.atualizarEstadoBotaoRegistrar();
      return;
    }

    select.innerHTML = '<option value="">Selecione um profissional</option>';

    profissionaisDoCurso.forEach((profissional) => {
      const option = document.createElement('option');
      option.value = String(profissional.id);
      const rawNome =
        profissional.nome ||
        profissional.name ||
        profissional.email;
      option.textContent =
        (window.FormatadorTexto && (profissional.nome || profissional.name))
          ? window.FormatadorTexto.formatarNomePessoa(rawNome)
          : rawNome;

      select.appendChild(option);
    });

    const idUsuarioAtual = Number(this.obterIdUsuario());
    const ehProfessor = this.obterPapelUsuario() === 'PROFESSOR';

    if (
      ehProfessor &&
      idUsuarioAtual &&
      profissionaisDoCurso.some(
        (profissional) => Number(profissional.id) === idUsuarioAtual
      )
    ) {
      select.value = String(idUsuarioAtual);
    }

    this.atualizarEstadoBotaoRegistrar();
  }

  setupFormulario() {
    const form = document.getElementById('attendance-form');
    if (!form) return;

    // Cascata: curso → atividades e profissionais
    const selectCurso = document.getElementById('attendance-course');
    if (selectCurso) {
      selectCurso.addEventListener('change', async (e) => {
        const idCurso = e.target.value;

        if (idCurso) {
          await this.carregarAtividades(idCurso);
          this.atualizarSelectProfessores(idCurso);
        } else {
          this.atividades = [];
          this.atualizarSelectAtividades();
          this.atualizarSelectProfessores();
        }
        this.sincronizarEstadoCamposDependentes();
        this.salvarEstadoTrabalho();
      });
    }

    const selectAtividade = document.getElementById('attendance-activity');
    if (selectAtividade) {
      selectAtividade.addEventListener('change', () => {
        this.atualizarEstadoBotaoRegistrar();
        this.salvarEstadoTrabalho();
      });
    }

    const selectProfissional = document.getElementById('attendance-professional');
    if (selectProfissional) {
      selectProfissional.addEventListener('change', () => {
        this.atualizarEstadoBotaoRegistrar();
        this.salvarEstadoTrabalho();
      });
    }

    document.getElementById('attendance-notes')?.addEventListener('input', () => {
      this.salvarEstadoTrabalho();
    });

    // Submissão do formulário
    form.addEventListener('submit', (e) => this.aoSubmeterForma(e));
  }

  async aplicarControleAcesso() {
    const ehProfessor = this.obterPapelUsuario() === 'PROFESSOR';

    // PROFESSOR: curso bloqueado (exibir como texto)
    const selectCurso = document.getElementById('attendance-course');
    if (ehProfessor && selectCurso) {
      selectCurso.disabled = true;
      selectCurso.style.backgroundColor = '#f3f4f6';
      selectCurso.style.cursor = 'not-allowed';

      // Auto-preencher com o curso do professor
      const idCursoUsuario = this.obterIdCursoUsuario();
      if (idCursoUsuario) {
        selectCurso.value = idCursoUsuario;
        // Carregar atividades do curso do professor
        await this.carregarAtividades(idCursoUsuario);
      }
    }

    const selectProfissional = document.getElementById('attendance-professional');

    if (ehProfessor && selectProfissional) {
      const idCursoUsuario = this.obterIdCursoUsuario();
      this.atualizarSelectProfessores(idCursoUsuario);
    } else {
      this.atualizarSelectProfessores(
        document.getElementById('attendance-course')?.value || null
      );
    }

    this.sincronizarEstadoCamposDependentes();
  }

  sincronizarEstadoCamposDependentes() {
    const ehProfessor = this.obterPapelUsuario() === 'PROFESSOR';
    const temPaciente = this.pacientesSelecionados.size > 0;

    const selectCurso = document.getElementById('attendance-course');
    const selectAtividade = document.getElementById('attendance-activity');
    const selectProfissional = document.getElementById('attendance-professional');
    const inputNotas = document.getElementById('attendance-notes');
    const btnSubmit = document.querySelector('#attendance-form button[type="submit"]');

    if (!temPaciente) {
      // Estado Inicial (sem paciente selecionado)
      if (ehProfessor) {
        if (selectCurso) {
          selectCurso.disabled = true;
          selectCurso.style.backgroundColor = '#f3f4f6';
          selectCurso.style.cursor = 'not-allowed';
        }
      } else {
        if (selectCurso) {
          selectCurso.disabled = true;
        }
      }

      if (selectAtividade) selectAtividade.disabled = true;
      if (selectProfissional) selectProfissional.disabled = true;
      if (inputNotas) inputNotas.disabled = true;
      if (btnSubmit) btnSubmit.disabled = true;
      return;
    }

    // Com paciente selecionado:
    if (inputNotas) inputNotas.disabled = false;

    if (ehProfessor) {
      // Professor: curso fixo e bloqueado para alteração
      if (selectCurso) {
        selectCurso.disabled = true;
        selectCurso.style.backgroundColor = '#f3f4f6';
        selectCurso.style.cursor = 'not-allowed';
      }

      // Atividade habilitada se houver atividades carregadas
      if (selectAtividade) {
        selectAtividade.disabled = this.atividades.length === 0;
      }

      // Profissional habilitado com professores do curso
      if (selectProfissional) {
        const temOpcoes = selectProfissional.options.length > 1 || (selectProfissional.options.length === 1 && selectProfissional.value !== '');
        selectProfissional.disabled = !temOpcoes;
      }
    } else {
      // Supervisor: curso habilitado
      if (selectCurso) {
        selectCurso.disabled = false;
      }

      const cursoSelecionado = selectCurso?.value;
      if (!cursoSelecionado) {
        if (selectAtividade) {
          selectAtividade.disabled = true;
          selectAtividade.innerHTML = '<option value="">Selecione o curso primeiro</option>';
        }
        if (selectProfissional) {
          selectProfissional.disabled = true;
          selectProfissional.innerHTML = '<option value="">Selecione um curso primeiro</option>';
        }
      } else {
        if (selectAtividade) {
          selectAtividade.disabled = this.atividades.length === 0;
        }
        if (selectProfissional) {
          const temOpcoes = selectProfissional.options.length > 1 || (selectProfissional.options.length === 1 && selectProfissional.value !== '');
          selectProfissional.disabled = !temOpcoes;
        }
      }
    }

    this.atualizarEstadoBotaoRegistrar();
  }

  atualizarEstadoBotaoRegistrar() {
    const btnSubmit = document.querySelector('#attendance-form button[type="submit"]');
    if (!btnSubmit) return;

    const temPaciente = this.pacientesSelecionados.size > 0;
    const selectCurso = document.getElementById('attendance-course');
    const selectAtividade = document.getElementById('attendance-activity');
    const selectProfissional = document.getElementById('attendance-professional');

    const temCurso = !!selectCurso?.value;
    const temAtividade = !!selectAtividade?.value;
    const temProfissional = !!selectProfissional?.value;

    btnSubmit.disabled = !(temPaciente && temCurso && temAtividade && temProfissional);
  }

  async aoSubmeterForma(e) {
    e.preventDefault();

    const idsPacientes = Array.from(this.pacientesSelecionados.values()).map((paciente) => paciente.id);
    const idCurso = document.getElementById('attendance-course')?.value;
    const idAtividade = document.getElementById('attendance-activity')?.value;
    const idProfissional = document.getElementById('attendance-professional')?.value;
    const observacoes = document.getElementById('attendance-notes')?.value;

    // Validação visual do seletor de paciente
    if (idsPacientes.length === 0) {
      const trigger = document.getElementById('attendance-patient-trigger');
      if (trigger) {
        trigger.classList.add('is-invalid');
        trigger.focus();
      }
      notify.error('Selecione um paciente');
      return;
    }

    if (!idCurso) {
      notify.error('Selecione um curso');
      return;
    }

    if (!idAtividade) {
      notify.error('Selecione uma atividade');
      return;
    }

    if (!idProfissional) {
      notify.error('Selecione um profissional');
      return;
    }

    const payload = {
      idsPacientes,
      idAtividade: parseInt(idAtividade, 10),
      idProfissional: parseInt(idProfissional, 10),
      observacoes: observacoes ? observacoes.trim() : null
    };

    try {
      const response = await fetch(`${this.API_BASE}/frequencia`, {
        method: 'POST',
        headers: this.obterHeaders(true),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        // Formatar data/hora da resposta
        const registradoEm = data.registradoEm || data.registrado_em;
        if (registradoEm) {
          const data_obj = new Date(registradoEm);
          const dataFormatada = data_obj.toLocaleDateString('pt-BR');
          const horaFormatada = data_obj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          notify.success(`Presença registrada para ${idsPacientes.length} paciente${idsPacientes.length > 1 ? 's' : ''}. Registrado em ${dataFormatada} às ${horaFormatada}.`);
        } else {
          notify.success(`Presença registrada para ${idsPacientes.length} paciente${idsPacientes.length > 1 ? 's' : ''}.`);
        }
        document.getElementById('attendance-form').reset();
        this.limparSelecaoPaciente();
        await this.aplicarControleAcesso();
      } else {
        const mensagem = data.message || 'Erro ao registrar presença';
        if (response.status === 409 && (
            String(data.code || '').startsWith('CALENDARIO') ||
            ['SEMESTRE_NAO_ATIVO', 'ATIVIDADE_SEM_DIAS', 'DIA_NAO_CONFIGURADO', 'DATA_SEM_ATENDIMENTO'].includes(data.code)
          )) {
          notify.warning ? notify.warning(mensagem) : notify.error(mensagem);
        } else {
          notify.error(mensagem);
        }
      }
    } catch (error) {
      console.error('Erro ao registrar presença:', error);
      notify.error('Erro ao conectar com o servidor');
    }
  }
}

// Instanciar ao carregar
let gerenciadorFrequencia;
document.addEventListener('DOMContentLoaded', () => {
  gerenciadorFrequencia = new GerenciadorFrequencia();
  window.gerenciadorFrequencia = gerenciadorFrequencia;
});

window.addEventListener('pagehide', () => {
  window.gerenciadorFrequencia?.salvarEstadoTrabalho?.();
  window.gerenciadorFrequencia?.salvarEstadoPainelRegistro?.();
});
