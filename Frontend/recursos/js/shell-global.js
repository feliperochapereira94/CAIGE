(function () {
  const BASE_URL = '/paginas';

  // O desktop do CAIGE usa 1366px como referência visual.
  // A ideia não é comprimir/alargar os cards conforme o monitor, e sim
  // alterar a escala do Shell inteiro (sidebar + página) mantendo a tela preenchida.
  const LARGURA_REFERENCIA_DESKTOP = 1366;
  const LARGURA_MINIMA_DESKTOP = 1025;
  const ESCALA_MINIMA_DESKTOP = 0.82;
  const ESCALA_MAXIMA_DESKTOP = 2.00;
  const CRESCIMENTO_LARGURA_VIRTUAL = 0.18;
  const LARGURA_VIRTUAL_MAXIMA = 1920;
  let escalaDesktopIniciada = false;
  let escalaDesktopRaf = null;


  // Fallback para navegadores que não executam a transição
  // cross-document nativa (especialmente Safari/iOS).
  const DURACAO_FADE_SAIDA_DESKTOP_MS = 220;
  const DURACAO_FADE_SAIDA_MOBILE_MS = 0;
  let transicaoManualIniciada = false;
  let navegacaoEmTransicao = false;

  function navegadorPrecisaTransicaoManual() {
    const movimentoReduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (movimentoReduzido) return false;

    const userAgent = navigator.userAgent || '';
    const plataforma = navigator.platform || '';
    const dispositivoAppleTouch =
      /iPad|iPhone|iPod/i.test(userAgent)
      || (plataforma === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1);

    const safari =
      /Safari/i.test(userAgent)
      && !/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|Android)/i.test(userAgent);

    const suportaViewTransition = typeof document.startViewTransition === 'function';

    return dispositivoAppleTouch || safari || !suportaViewTransition;
  }

  function obterDuracaoFadeSaida() {
    const celularOuTablet = window.matchMedia?.('(max-width: 1024px)').matches === true;

    return celularOuTablet
      ? DURACAO_FADE_SAIDA_MOBILE_MS
      : DURACAO_FADE_SAIDA_DESKTOP_MS;
  }

  function linkElegivelParaTransicao(link, evento) {
    if (!link || link.hasAttribute('download')) return false;
    if (link.hasAttribute('data-no-page-transition')) return false;

    const alvo = String(link.getAttribute('target') || '').trim().toLowerCase();
    if (alvo && alvo !== '_self') return false;

    if (evento?.button !== undefined && evento.button !== 0) return false;
    if (evento?.metaKey || evento?.ctrlKey || evento?.shiftKey || evento?.altKey) return false;

    const hrefOriginal = String(link.getAttribute('href') || '').trim();
    if (!hrefOriginal || hrefOriginal === '#' || hrefOriginal.startsWith('javascript:')) return false;
    if (/^(mailto:|tel:)/i.test(hrefOriginal)) return false;

    let destino;
    try {
      destino = new URL(link.href, window.location.href);
    } catch {
      return false;
    }

    if (destino.origin !== window.location.origin) return false;

    const mesmaPagina =
      destino.pathname === window.location.pathname
      && destino.search === window.location.search;

    if (mesmaPagina && destino.hash !== window.location.hash) return false;
    if (destino.href === window.location.href) return false;

    return true;
  }

  function iniciarEntradaTransicaoManual() {
    const corpo = document.body;
    if (!corpo) return;

    corpo.classList.remove('caige-pagina-saindo');
    corpo.classList.add('caige-pagina-entrando');

    const limparEntrada = () => {
      corpo.classList.remove('caige-pagina-entrando');
    };

    corpo.addEventListener('animationend', limparEntrada, { once: true });
    window.setTimeout(limparEntrada, 450);
  }

  function inicializarTransicaoManualPaginas() {
    if (transicaoManualIniciada || !navegadorPrecisaTransicaoManual()) return;
    transicaoManualIniciada = true;

    document.documentElement.classList.add('caige-transicao-manual');
    iniciarEntradaTransicaoManual();

    document.addEventListener('click', (evento) => {
      if (navegacaoEmTransicao || evento.defaultPrevented) return;

      const alvo = evento.target;
      const link = alvo?.closest?.('a[href]');
      if (!linkElegivelParaTransicao(link, evento)) return;

      evento.preventDefault();
      navegacaoEmTransicao = true;

      const destino = link.href;
      const corpo = document.body;

      if (!corpo) {
        window.location.assign(destino);
        return;
      }

      corpo.classList.remove('caige-pagina-entrando');
      corpo.classList.add('caige-pagina-saindo');

      window.setTimeout(() => {
        window.location.assign(destino);
      }, obterDuracaoFadeSaida());
    }, true);

    window.addEventListener('pageshow', () => {
      navegacaoEmTransicao = false;
      iniciarEntradaTransicaoManual();
    });
  }

  function calcularEscalaDesktop(larguraViewport) {
    if (larguraViewport < LARGURA_MINIMA_DESKTOP) {
      return 1;
    }

    // Em desktop menor que a referência, mantém aproximadamente a mesma
    // largura virtual de 1366px e reduz o conjunto inteiro para caber.
    if (larguraViewport < LARGURA_REFERENCIA_DESKTOP) {
      return Math.max(
        ESCALA_MINIMA_DESKTOP,
        larguraViewport / LARGURA_REFERENCIA_DESKTOP
      );
    }

    // Em monitores maiores, a largura virtual cresce bem mais devagar que
    // a largura física. Assim o Shell continua preenchendo a tela, mas os
    // cards preservam uma densidade próxima da visualização de 1366px.
    const excedente = larguraViewport - LARGURA_REFERENCIA_DESKTOP;
    const larguraVirtual = Math.min(
      LARGURA_VIRTUAL_MAXIMA,
      LARGURA_REFERENCIA_DESKTOP + (excedente * CRESCIMENTO_LARGURA_VIRTUAL)
    );

    return Math.min(
      ESCALA_MAXIMA_DESKTOP,
      larguraViewport / larguraVirtual
    );
  }

  function aplicarEscalaDesktop() {
    const corpo = document.body;
    if (!corpo) return;

    const larguraViewport = document.documentElement.clientWidth
      || window.innerWidth
      || LARGURA_REFERENCIA_DESKTOP;

    if (larguraViewport < LARGURA_MINIMA_DESKTOP) {
      corpo.classList.remove('caige-ui-escalada');
      document.documentElement.classList.remove('caige-ui-escalada');
      document.documentElement.style.removeProperty('--escala-ui-desktop');
      document.documentElement.style.removeProperty('--largura-ui-desktop');
      document.documentElement.style.removeProperty('--altura-ui-desktop');
      return;
    }

    const alturaViewport = document.documentElement.clientHeight
      || window.innerHeight
      || 768;

    const escala = calcularEscalaDesktop(larguraViewport);
    const larguraVirtual = larguraViewport / escala;
    const alturaVirtual = alturaViewport / escala;

    // A dimensão virtual é calculada em pixels. O body é renderizado nessa
    // dimensão e depois recebe transform: scale(). Assim sidebar + página
    // chegam exatamente às bordas da viewport, sem a faixa vazia que o
    // CSS zoom pode produzir em alguns navegadores.
    document.documentElement.style.setProperty('--escala-ui-desktop', escala.toFixed(4));
    document.documentElement.style.setProperty('--largura-ui-desktop', `${larguraVirtual.toFixed(2)}px`);
    document.documentElement.style.setProperty('--altura-ui-desktop', `${alturaVirtual.toFixed(2)}px`);
    document.documentElement.classList.add('caige-ui-escalada');
    corpo.classList.add('caige-ui-escalada');
  }

  function inicializarEscalaDesktop() {
    if (escalaDesktopIniciada) return;
    escalaDesktopIniciada = true;

    aplicarEscalaDesktop();

    window.addEventListener('resize', () => {
      if (escalaDesktopRaf !== null) {
        window.cancelAnimationFrame(escalaDesktopRaf);
      }

      escalaDesktopRaf = window.requestAnimationFrame(() => {
        escalaDesktopRaf = null;
        aplicarEscalaDesktop();
      });
    }, { passive: true });
  }

  function carregarAbasNavegacao() {
    if (window.CAIGEAbasNavegacao) {
      return Promise.resolve(window.CAIGEAbasNavegacao);
    }

    return new Promise((resolve, reject) => {
      const existente = document.querySelector('script[data-caige-abas-navegacao]');
      if (existente) {
        existente.addEventListener('load', () => resolve(window.CAIGEAbasNavegacao), { once: true });
        existente.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = '/recursos/js/abas-navegacao.js';
      script.defer = true;
      script.setAttribute('data-caige-abas-navegacao', 'true');
      script.addEventListener('load', () => resolve(window.CAIGEAbasNavegacao), { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }


  const MENU = [
    {
      id: 'painel',
      titulo: 'Painel',
      tituloMobile: 'Painel',
      iconeSvg: 'painel',
      destino: `${BASE_URL}/painel/painel.html`,
      perfisPermitidos: ['SUPERVISOR', 'PROFESSOR'],
      exibirNaBottomNav: true,
      ordemMobile: 1
    },
    {
      id: 'atividades',
      titulo: 'Movimentações',
      tituloMobile: 'Movimentos',
      iconeSvg: 'movimentacoes',
      destino: `${BASE_URL}/atividades/atividades.html`,
      perfisPermitidos: ['SUPERVISOR', 'PROFESSOR'],
      exibirNaBottomNav: true,
      ordemMobile: 2
    },
    {
      id: 'pacientes',
      titulo: 'Pacientes',
      tituloMobile: 'Pacientes',
      iconeSvg: 'pacientes',
      destino: `${BASE_URL}/pacientes/lista.html`,
      rotasRelacionadas: [
        `${BASE_URL}/pacientes/novo.html`,
        `${BASE_URL}/pacientes/editar.html`,
        `${BASE_URL}/pacientes/visualizar.html`,
        `${BASE_URL}/pacientes/prontuario.html`
      ],
      perfisPermitidos: ['SUPERVISOR', 'PROFESSOR'],
      exibirNaBottomNav: true,
      ordemMobile: 3
    },
    {
      id: 'prontuarios',
      iconeSvg: 'prontuarios',
      titulo: 'Gestão de Prontuários',
      tituloMobile: 'Prontuários',
      tipo: 'grupo',
      destino: `${BASE_URL}/pacientes/questionario-detalhes.html`,
      rotasRelacionadas: [
        `${BASE_URL}/pacientes/questionario-detalhes.html`,
        `${BASE_URL}/pacientes/questionarios.html`
      ],
      filhos: [
        {
          id: 'cadastro-perguntas',
          titulo: 'Cadastro de Perguntas',
          iconeSvg: 'pergunta',
          destino: `${BASE_URL}/pacientes/questionarios.html`,
          rotasRelacionadas: [
            `${BASE_URL}/pacientes/questionarios.html`
          ],
          perfisPermitidos: ['SUPERVISOR', 'PROFESSOR']
        },
        {
          id: 'prontuarios-cadastrados',
          titulo: 'Prontuários Cadastrados',
          iconeSvg: 'prontuarios',
          destino: `${BASE_URL}/pacientes/questionario-detalhes.html`,
          rotasRelacionadas: [
            `${BASE_URL}/pacientes/questionario-detalhes.html`
          ],
          perfisPermitidos: ['SUPERVISOR', 'PROFESSOR']
        }
      ],
      perfisPermitidos: ['SUPERVISOR', 'PROFESSOR'],
      exibirNaBottomNav: true,
      ordemMobile: 4
    },
    {
      id: 'frequencia',
      titulo: 'Frequência',
      tituloMobile: 'Frequência',
      iconeSvg: 'frequencia',
      destino: `${BASE_URL}/frequencia/relatorio-frequencia.html`,
      perfisPermitidos: ['SUPERVISOR', 'PROFESSOR'],
      exibirNaBottomNav: true,
      ordemMobile: 5
    },
    {
      id: 'gerenciamento',
      titulo: 'Painel de Gerenciamento',
      tituloMobile: 'Gerenciamento',
      iconeSvg: 'gerenciamento',
      destino: `${BASE_URL}/administracao/usuarios.html`,
      perfisPermitidos: ['SUPERVISOR'],
      exibirNaBottomNav: false
    }
  ];

  function normalizarPath(pathname) {
    return String(pathname || '')
      .replace(/\\/g, '/')
      .replace(/\/$/, '')
      .toLowerCase();
  }

  function obterPapelAtual() {
    try {
      if (window.UtilJWT && typeof window.UtilJWT.obterUsuario === 'function') {
        const usuario = window.UtilJWT.obterUsuario();
        if (usuario?.papel || usuario?.role) {
          return String(usuario.papel || usuario.role).toUpperCase();
        }
      }

      const usuarioRaw = localStorage.getItem('caige_usuario') || localStorage.getItem('usuario');
      if (usuarioRaw) {
        const parsed = JSON.parse(usuarioRaw);
        if (parsed?.papel || parsed?.role) {
          return String(parsed.papel || parsed.role).toUpperCase();
        }
      }

      if (window.controleAcesso && window.controleAcesso.papel) {
        return String(window.controleAcesso.papel).toUpperCase();
      }

      return '';
    } catch {
      return '';
    }
  }

  function possuiAcesso(item, papel) {
    if (!item.perfisPermitidos || !item.perfisPermitidos.length) {
      return true;
    }
    if (!papel) {
      return false;
    }
    return item.perfisPermitidos.includes(papel);
  }

  function itemEstaAtivo(item, pathname) {
    const atual = normalizarPath(pathname);
    const destino = normalizarPath(item.destino);
    if (atual === destino) {
      return true;
    }

    return (item.rotasRelacionadas || []).some((rota) => normalizarPath(rota) === atual);
  }

  function grupoTemFilhoAtivo(grupo, pathname) {
    return (grupo.filhos || []).some((filho) => itemEstaAtivo(filho, pathname));
  }

  function criarLinkMenu(item, ativo) {
    const link = document.createElement('a');
    link.className = `sidebar__link${ativo ? ' sidebar__link--active' : ''}`;
    link.href = item.destino;
    link.setAttribute('data-shell-id', item.id);
    if (item.perfisPermitidos?.length) {
      link.setAttribute('data-require-role', item.perfisPermitidos.join(','));
    }

    link.innerHTML = `
      <span class="icone" data-icone="${item.iconeSvg}" aria-hidden="true"></span>
      <span>${item.titulo}</span>
    `;

    return link;
  }

  function criarGrupoMenu(item, ativo, pathname) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sidebar__menu-item';
    if (item.perfisPermitidos?.length) {
      wrapper.setAttribute('data-require-role', item.perfisPermitidos.join(','));
    }

    const submenuId = `shell-${item.id}-submenu`;
    const botao = document.createElement('button');
    botao.className = `sidebar__menu-toggle${ativo ? ' sidebar__menu-toggle--active' : ''}`;
    botao.type = 'button';
    botao.setAttribute('data-expand', submenuId);
    botao.setAttribute('aria-expanded', ativo ? 'true' : 'false');

    botao.innerHTML = `
      <span class="icone" data-icone="${item.iconeSvg}" aria-hidden="true"></span>
      <span>${item.titulo}</span>
      <span class="sidebar__menu-icon icone" data-icone="mais" aria-hidden="true"></span>
    `;

    const submenu = document.createElement('div');
    submenu.className = `sidebar__submenu${ativo ? ' open' : ''}`;
    submenu.id = submenuId;

    (item.filhos || []).forEach((filho) => {
      const filhoAtivo = itemEstaAtivo(filho, pathname);
      const link = document.createElement('a');
      link.className = `sidebar__submenu-link${filhoAtivo ? ' sidebar__submenu-link--active' : ''}`;
      link.href = filho.destino;
      link.setAttribute('data-shell-id', filho.id);
      if (filho.perfisPermitidos?.length) {
        link.setAttribute('data-require-role', filho.perfisPermitidos.join(','));
      }
      link.innerHTML = `
        <span class="icone icone--sm" data-icone="${filho.iconeSvg}" aria-hidden="true"></span>
        <span>${filho.titulo}</span>
      `;
      submenu.appendChild(link);
    });

    wrapper.appendChild(botao);
    wrapper.appendChild(submenu);
    return wrapper;
  }

  function renderizarSidebar(container, pathname, papel) {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    sidebar.innerHTML = `
      <div class="sidebar__brand">
        <img src="/recursos/images/logocaigebranco.png" alt="CAIGE Univale" class="sidebar__logo" />
      </div>
    `;

    const nav = document.createElement('nav');
    nav.className = 'sidebar__nav';

    MENU.forEach((item) => {
      if (!possuiAcesso(item, papel)) {
        return;
      }

      if (item.tipo === 'grupo') {
        nav.appendChild(criarGrupoMenu(item, grupoTemFilhoAtivo(item, pathname), pathname));
      } else {
        nav.appendChild(criarLinkMenu(item, itemEstaAtivo(item, pathname)));
      }
    });

    sidebar.appendChild(nav);
    container.replaceWith(sidebar);
  }

  function obterIdentidadeInicialHeader() {
    let usuario = null;

    try {
      if (window.UtilJWT && typeof window.UtilJWT.obterUsuario === 'function') {
        usuario = window.UtilJWT.obterUsuario();
      }
    } catch {
      usuario = null;
    }

    if (!usuario) {
      try {
        const usuarioRaw = localStorage.getItem('caige_usuario') || localStorage.getItem('usuario');
        if (usuarioRaw) usuario = JSON.parse(usuarioRaw);
      } catch {
        usuario = null;
      }
    }

    const email = String(
      usuario?.email || localStorage.getItem('userEmail') || ''
    ).trim();
    const username = email.split('@')[0] || 'US';
    const nome = String(
      usuario?.nome || usuario?.name || sessionStorage.getItem('userName') || username
    ).trim();

    return {
      nomeUsuario: nome || 'Usuário',
      emailUsuario: email || '-',
      iniciaisUsuario: username.substring(0, 2).toUpperCase() || 'US'
    };
  }

  function renderizarHeader(container, config, papel) {
    const header = document.createElement('header');
    header.className = 'content__header largura-pagina';

    const titulo = config.titulo || '';
    const tituloHtml = config.tituloHtml || '';
    const subtitulo = config.subtitulo || '';
    const subtituloHtml = config.subtituloHtml || '';
    const identidadeInicial = obterIdentidadeInicialHeader();
    const nomeUsuario = config.nomeUsuario || identidadeInicial.nomeUsuario;
    const emailUsuario = config.emailUsuario || identidadeInicial.emailUsuario;
    const iniciais = config.iniciaisUsuario || identidadeInicial.iniciaisUsuario;

    let menuItensHtml = '';

    if (papel === 'SUPERVISOR') {
      menuItensHtml += `
            <a href="${BASE_URL}/administracao/usuarios.html" class="user-dropdown__item user-dropdown__item--admin" data-action="manage-users">
              <span class="user-dropdown__item-icon icone" data-icone="gerenciamento" aria-hidden="true"></span>
              Painel de Gerenciamento
            </a>
            <div class="user-dropdown__divider"></div>
      `;
    } else if (papel === 'PROFESSOR') {
      menuItensHtml += `
            <a href="${BASE_URL}/cursos/meu-curso.html" class="user-dropdown__item" data-action="my-course">
              <span class="user-dropdown__item-icon icone" data-icone="cursos" aria-hidden="true"></span>
              Meu Curso
            </a>
            <div class="user-dropdown__divider"></div>
      `;
    }

    menuItensHtml += `
            <button class="user-dropdown__item" data-action="my-account" data-modal="account" type="button">
              <span class="user-dropdown__item-icon icone" data-icone="usuario" aria-hidden="true"></span>
              Minha Conta
            </button>
            <div class="user-dropdown__divider"></div>
            <button class="user-dropdown__item user-dropdown__item--danger" data-action="logout" type="button">
              <span class="user-dropdown__item-icon icone" data-icone="sair" aria-hidden="true"></span>
              Sair
            </button>
    `;

    header.innerHTML = `
      <div>
        <h2>${tituloHtml || titulo}</h2>
        ${subtituloHtml || subtitulo ? `<p>${subtituloHtml || subtitulo}</p>` : ''}
      </div>

      <div class="user-menu">
        <button class="user-avatar-btn" id="user-avatar-btn" type="button" aria-label="Abrir menu do usuário">
          <span class="content__user-avatar" id="user-avatar">${iniciais}</span>
        </button>

        <div class="user-dropdown">
          <div class="user-dropdown__header">
            <div class="user-dropdown__avatar" id="dropdown-avatar">${iniciais}</div>
            <div class="user-dropdown__identity">
              <div class="user-dropdown__name" id="dropdown-name">${nomeUsuario}</div>
              <div class="user-dropdown__email" id="dropdown-email">${emailUsuario}</div>
            </div>
          </div>

          <div class="user-dropdown__body">
            ${menuItensHtml}
          </div>
        </div>
      </div>
    `;

    container.replaceWith(header);
    if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
      window.IconesCAIGE.aplicar(header);
    }
  }

  function renderizarBottomNav(pathname, papel) {
    let bottomNav = document.getElementById('mobile-bottom-nav');
    if (bottomNav) {
      bottomNav.remove();
    }

    bottomNav = document.createElement('nav');
    bottomNav.id = 'mobile-bottom-nav';
    bottomNav.className = 'mobile-bottom-nav';
    bottomNav.setAttribute('aria-label', 'Navegação principal');

    const itens = MENU
      .filter((item) => item.exibirNaBottomNav && possuiAcesso(item, papel))
      .sort((a, b) => (a.ordemMobile || 99) - (b.ordemMobile || 99));

    itens.forEach((item) => {
      let destino = item.destino;
      let ativo = false;

      if (item.tipo === 'grupo') {
        const primeiroFilho = item.filhos && item.filhos[0];
        destino = primeiroFilho ? primeiroFilho.destino : item.destino;
        ativo = grupoTemFilhoAtivo(item, pathname);
      } else {
        ativo = itemEstaAtivo(item, pathname);
      }

      const link = document.createElement('a');
      link.className = `mobile-bottom-nav__link${ativo ? ' mobile-bottom-nav__link--active' : ''}`;
      link.href = destino;
      link.setAttribute('data-shell-id', item.id);
      link.setAttribute('aria-label', item.titulo);
      if (ativo) {
        link.setAttribute('aria-current', 'page');
      }

      const rotulo = item.tituloMobile || item.titulo;

      link.innerHTML = `
        <span class="icone mobile-bottom-nav__icon" data-icone="${item.iconeSvg}" aria-hidden="true"></span>
        <span class="mobile-bottom-nav__label">${rotulo}</span>
      `;

      bottomNav.appendChild(link);
    });

    document.body.appendChild(bottomNav);
    document.body.classList.add('caige-has-mobile-bottom-nav');

    if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
      window.IconesCAIGE.aplicar(bottomNav);
    }

  }

  function inicializarShellGlobal(config = {}) {
    const sidebarPlaceholder = document.getElementById('shell-sidebar');
    const headerPlaceholder = document.getElementById('shell-header');

    if (!sidebarPlaceholder || !headerPlaceholder) {
      return false;
    }

    const pathname = window.location.pathname || '';
    const papel = obterPapelAtual();

    renderizarSidebar(sidebarPlaceholder, pathname, papel);
    renderizarHeader(headerPlaceholder, config, papel);
    renderizarBottomNav(pathname, papel);

    if (typeof window.initSidebarMenus === 'function') {
      window.initSidebarMenus({ closeOthers: true, toggleActiveClass: true });
    }

    if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
      window.IconesCAIGE.aplicar(document);
    }

    window.__CAIGE_SHELL_GLOBAL_READY__ = true;
    document.dispatchEvent(new CustomEvent('caige:shell-global-pronto'));
    return true;
  }

  window.inicializarShellGlobal = inicializarShellGlobal;
  window.CAIGEShellGlobal = {
    menu: MENU,
    inicializar: inicializarShellGlobal
  };

  function carregarScript(src, id, globalVar) {
    if (globalVar && window[globalVar]) {
      return Promise.resolve(window[globalVar]);
    }

    return new Promise((resolve, reject) => {
      const seletor = `script[${id}]`;
      const existente = document.querySelector(seletor);
      if (existente) {
        if (globalVar && window[globalVar]) {
          resolve(window[globalVar]);
        } else {
          existente.addEventListener('load', () => resolve(globalVar ? window[globalVar] : true), { once: true });
          existente.addEventListener('error', reject, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.setAttribute(id, 'true');
      script.addEventListener('load', () => resolve(globalVar ? window[globalVar] : true), { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function carregarInfraestruturaFeedback() {
    try {
      await carregarScript('/recursos/js/icones.js', 'data-caige-icones', 'IconesCAIGE');
      await carregarScript('/recursos/js/notificacoes.js', 'data-caige-notificacoes', 'notify');
      await carregarScript('/recursos/js/modal-confirmacao.js', 'data-caige-modal-confirmacao', 'ModalConfirmacao');
    } catch (erro) {
      console.warn('Aviso: Falha ao carregar infraestrutura de feedback pelo shell-global:', erro);
    }
  }

  async function boot() {
    if (!document.getElementById('shell-sidebar') || !document.getElementById('shell-header')) {
      return;
    }

    inicializarTransicaoManualPaginas();
    inicializarEscalaDesktop();

    await carregarInfraestruturaFeedback();

    const isPainel = /\/painel\/painel\.html$/i.test(window.location.pathname || '');

    inicializarShellGlobal({
      titulo: document.body?.dataset?.pageTitle || 'Painel',
      tituloHtml: isPainel
        ? 'Bem-vindo(a), <span id="user-welcome">Usuário</span>'
        : '',
      subtitulo: document.body?.dataset?.pageSubtitle || 'Acompanhe os principais pacientes, presenças e prontuários do dia.'
    });

    try {
      const abasNavegacao = await carregarAbasNavegacao();
      if (abasNavegacao && typeof abasNavegacao.inicializar === 'function') {
        abasNavegacao.inicializar();
      }
    } catch (error) {
      console.error('Erro ao inicializar abas de navegação:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
