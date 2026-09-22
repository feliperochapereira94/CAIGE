(function () {
  const STORAGE_KEY = 'caige_abas_modulos_v3';
  const FALLBACK_URL = '/paginas/painel/painel.html';

  function normalizarPath(pathname) {
    return String(pathname || '')
      .replace(/\\/g, '/')
      .replace(/\/$/, '')
      .toLowerCase();
  }

  function urlAtual() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function rotaPertenceAoItem(item, pathname) {
    const atual = normalizarPath(pathname);
    const destino = normalizarPath(item?.destino);

    if (destino && atual === destino) {
      return true;
    }

    return (item?.rotasRelacionadas || [])
      .some((rota) => normalizarPath(rota) === atual);
  }

  function obterModuloPorUrl(url) {
    try {
      const destino = new URL(url, window.location.origin);
      const menu = window.CAIGEShellGlobal?.menu || [];
      const pathname = destino.pathname || '';

      for (const item of menu) {
        if (item.tipo === 'grupo') {
          const filhoAtivo = (item.filhos || [])
            .find((filho) => rotaPertenceAoItem(filho, pathname));

          if (filhoAtivo) {
            return {
              id: item.id,
              titulo: item.titulo,
              destinoPadrao: filhoAtivo.destino || item.destino || FALLBACK_URL
            };
          }

          continue;
        }

        if (rotaPertenceAoItem(item, pathname)) {
          return {
            id: item.id,
            titulo: item.titulo,
            destinoPadrao: item.destino || FALLBACK_URL
          };
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  function obterModuloAtual() {
    const menu = window.CAIGEShellGlobal?.menu || [];
    const pathname = window.location.pathname || '';

    for (const item of menu) {
      if (item.tipo === 'grupo') {
        const filhoAtivo = (item.filhos || [])
          .find((filho) => rotaPertenceAoItem(filho, pathname));

        if (filhoAtivo) {
          return {
            id: item.id,
            titulo: item.titulo,
            destinoPadrao: filhoAtivo.destino || item.destino || FALLBACK_URL
          };
        }

        continue;
      }

      if (rotaPertenceAoItem(item, pathname)) {
        return {
          id: item.id,
          titulo: item.titulo,
          destinoPadrao: item.destino || FALLBACK_URL
        };
      }
    }

    return null;
  }

  function carregarEstado() {
    try {
      const salvo = sessionStorage.getItem(STORAGE_KEY);
      const estado = salvo ? JSON.parse(salvo) : null;

      return {
        abas: Array.isArray(estado?.abas) ? estado.abas : [],
        historico: Array.isArray(estado?.historico) ? estado.historico : []
      };
    } catch {
      return {
        abas: [],
        historico: []
      };
    }
  }

  function salvarEstado(estado) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }

  function paginaIgnoraPersistenciaScroll() {
    return document.body?.dataset?.caigePersistScroll === 'false';
  }

  function obterScrollAtual() {
    if (paginaIgnoraPersistenciaScroll()) return 0;
    if (window.matchMedia('(min-width: 1025px)').matches) {
      const content = document.querySelector(
        '.content, .activities-content, .app-content'
      );

      return content ? content.scrollTop : 0;
    }

    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  function restaurarScroll(valor) {
    const scrollTop = Number(valor) || 0;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (window.matchMedia('(min-width: 1025px)').matches) {
          const content = document.querySelector(
            '.content, .activities-content, .app-content'
          );

          if (content) {
            content.scrollTop = scrollTop;
          }

          return;
        }

        window.scrollTo(0, scrollTop);
      });
    });
  }

  function registrarModuloAtual() {
    const modulo = obterModuloAtual();

    if (!modulo) {
      return {
        estado: carregarEstado(),
        modulo: null
      };
    }

    const estado = carregarEstado();
    const url = urlAtual();
    const indice = estado.abas.findIndex((aba) => aba.id === modulo.id);

    if (indice >= 0) {
      const aba = estado.abas[indice];

      aba.titulo = modulo.titulo;
      aba.url = url;
      aba.scrollPorUrl = aba.scrollPorUrl || {};
    } else {
      estado.abas.push({
        id: modulo.id,
        titulo: modulo.titulo,
        url,
        scrollPorUrl: {}
      });
    }

    estado.historico = estado.historico.filter((id) => id !== modulo.id);
    estado.historico.push(modulo.id);

    salvarEstado(estado);

    return {
      estado,
      modulo
    };
  }

  function salvarEstadoModulo(moduloId, chave, dados) {
    if (!moduloId || !chave) return false;

    const estado = carregarEstado();
    const aba = estado.abas.find((item) => item.id === moduloId);
    if (!aba) return false;

    aba.dados = aba.dados || {};
    aba.dados[chave] = dados;
    salvarEstado(estado);
    return true;
  }

  function obterEstadoModulo(moduloId, chave) {
    if (!moduloId || !chave) return null;

    const estado = carregarEstado();
    const aba = estado.abas.find((item) => item.id === moduloId);
    return aba?.dados?.[chave] ?? null;
  }

  function salvarScrollAtual() {
    if (paginaIgnoraPersistenciaScroll()) return;

    const modulo = obterModuloAtual();

    if (!modulo) {
      return;
    }

    const estado = carregarEstado();
    const aba = estado.abas.find((item) => item.id === modulo.id);

    if (!aba) {
      return;
    }

    const url = urlAtual();

    aba.url = url;
    aba.scrollPorUrl = aba.scrollPorUrl || {};
    aba.scrollPorUrl[url] = obterScrollAtual();

    salvarEstado(estado);
  }

  function navegar(url) {
    if (!url || url === urlAtual()) {
      return;
    }

    salvarScrollAtual();
    window.location.href = url;
  }

  function limparEstadoDoModulo(moduloId) {
    try {
      const modulosEstado = {
        painel: ['painel'],
        movimentacoes: ['movimentacoes'],
        pacientes: ['pacientes'],
        prontuarios: ['prontuarios'],
        frequencia: ['frequencia'],
        gerenciamento: ['gerenciamento', 'auditoria']
      };

      const escopos = modulosEstado[moduloId] || [moduloId];
      escopos.forEach((escopo) => {
        window.EstadoSessao?.limparModulo?.(escopo);
      });

      // Componentes antigos (como PainelRetratil) ainda usam chaves diretas.
      // Elas também pertencem ao estado temporário da guia interna do CAIGE.
      const prefixosDiretos = {
        painel: ['caige:painel:'],
        movimentacoes: ['caige:movimentacoes:'],
        pacientes: ['caige:pacientes:'],
        prontuarios: ['caige:prontuarios:', 'caige:perguntas:'],
        frequencia: ['caige:frequencia:'],
        gerenciamento: ['caige:gerenciamento:', 'caige:auditoria:']
      };

      const prefixos = prefixosDiretos[moduloId] || [];
      if (prefixos.length) {
        const remover = [];
        for (let i = 0; i < sessionStorage.length; i += 1) {
          const chave = sessionStorage.key(i);
          if (chave && prefixos.some((prefixo) => chave.startsWith(prefixo))) {
            remover.push(chave);
          }
        }
        remover.forEach((chave) => sessionStorage.removeItem(chave));
      }
    } catch (erro) {
      console.warn('CAIGE: não foi possível limpar o estado temporário do módulo fechado.', erro);
    }
  }

  function fecharModulo(moduloId) {
    const estado = carregarEstado();

    const abaFechada = estado.abas.find((aba) => aba.id === moduloId);
    const eraAtual = obterModuloAtual()?.id === moduloId;

    estado.abas = estado.abas.filter((aba) => aba.id !== moduloId);
    estado.historico = estado.historico.filter((id) => id !== moduloId);

    // Fechar a guia interna do CAIGE encerra o estado temporário daquele módulo.
    // Navegar entre módulos sem fechar a guia continua preservando o trabalho.
    limparEstadoDoModulo(moduloId);

    let destino = null;

    if (eraAtual) {
      const idAnterior = [...estado.historico]
        .reverse()
        .find((id) => estado.abas.some((aba) => aba.id === id));

      if (idAnterior) {
        destino = estado.abas.find((aba) => aba.id === idAnterior)?.url || null;
      }

      if (!destino && estado.abas.length) {
        destino = estado.abas[estado.abas.length - 1].url;
      }
    }

    salvarEstado(estado);

    if (eraAtual) {
      window.location.href = destino || FALLBACK_URL;
      return;
    }

    const abaElement = document.querySelector(
      `[data-workspace-tab="${CSS.escape(moduloId)}"]`
    );

    abaElement?.closest('.workspace-tab')?.remove();

    const shell = document.getElementById('workspace-tabs-shell');
    if (shell && !shell.querySelector('.workspace-tab')) {
      shell.remove();
    }

    if (abaFechada) {
      document.dispatchEvent(new CustomEvent('caige:aba-fechada', {
        detail: abaFechada
      }));
    }
  }

  function criarBarraAbas(estado, moduloAtual) {
    const existente = document.getElementById('workspace-tabs-shell');

    if (existente) {
      existente.remove();
    }

    if (!estado.abas.length) {
      return;
    }

    const shell = document.createElement('div');
    shell.id = 'workspace-tabs-shell';
    shell.className = 'workspace-tabs-shell largura-pagina';

    const nav = document.createElement('nav');
    nav.className = 'workspace-tabs';
    nav.setAttribute('aria-label', 'Módulos abertos');

    estado.abas.forEach((aba) => {
      const wrapper = document.createElement('div');
      const ativo = aba.id === moduloAtual?.id;

      wrapper.className = `workspace-tab${ativo ? ' workspace-tab--active' : ''}`;

      const link = document.createElement('a');
      link.className = 'workspace-tab__link';
      link.href = aba.url;
      link.textContent = aba.titulo;
      link.title = aba.titulo;
      link.setAttribute('data-workspace-tab', aba.id);

      if (ativo) {
        link.setAttribute('aria-current', 'page');
      }

      link.addEventListener('click', (event) => {
        event.preventDefault();
        const estadoAtual = carregarEstado();
        const abaAtualizada = estadoAtual.abas.find((item) => item.id === aba.id);
        navegar(abaAtualizada?.url || aba.url);
      });

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'workspace-tab__close';
      close.setAttribute('aria-label', `Fechar módulo ${aba.titulo}`);
      close.title = `Fechar ${aba.titulo}`;
      close.innerHTML = '<span class="icone icone--xs" data-icone="fechar" aria-hidden="true"></span>';
      window.IconesCAIGE?.aplicar?.(close);

      close.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        fecharModulo(aba.id);
      });

      wrapper.appendChild(link);
      wrapper.appendChild(close);
      nav.appendChild(wrapper);
    });

    shell.appendChild(nav);

    const header = document.querySelector(
      '.content__header, .activities-header, .dashboard-header, .page-header'
    );

    if (header) {
      header.insertAdjacentElement('afterend', shell);
    }
  }

  function vincularRetornoAbas() {
    if (document.body.dataset.caigeAbasWorkspaceTabs === 'true') {
      return;
    }

    document.addEventListener('click', (event) => {
      if (event.target.closest('.workspace-tab__close')) {
        return;
      }

      const tab = event.target.closest('.workspace-tab');
      if (!tab) {
        return;
      }

      const link = tab.querySelector('.workspace-tab__link');
      if (!link) {
        return;
      }

      const moduloId = link.getAttribute('data-workspace-tab');
      if (!moduloId) {
        return;
      }

      const estado = carregarEstado();
      const abaAberta = estado.abas.find((aba) => aba.id === moduloId);

      if (!abaAberta?.url) {
        return;
      }

      event.preventDefault();
      navegar(abaAberta.url);
    }, true);

    document.body.dataset.caigeAbasWorkspaceTabs = 'true';
  }

  function vincularRetornoSidebar() {
    if (document.body.dataset.caigeAbasSidebar === 'true') {
      return;
    }

    document.addEventListener('click', (event) => {
      const link = event.target.closest('.sidebar__link[href]');

      if (!link) {
        return;
      }

      const href = link.getAttribute('href');

      if (!href || href.startsWith('#')) {
        return;
      }

      const moduloDestino = obterModuloPorUrl(link.href);

      if (!moduloDestino) {
        return;
      }

      const estado = carregarEstado();
      const abaAberta = estado.abas.find((aba) => aba.id === moduloDestino.id);

      if (!abaAberta?.url) {
        return;
      }

      event.preventDefault();
      navegar(abaAberta.url);
    }, true);

    document.body.dataset.caigeAbasSidebar = 'true';
  }

  function vincularPersistencia() {
    if (document.body.dataset.caigeAbasPersistencia === 'true') {
      return;
    }

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');

      if (!link) {
        return;
      }

      const href = link.getAttribute('href');

      if (!href || href.startsWith('#') || link.target === '_blank') {
        return;
      }

      try {
        const destino = new URL(link.href, window.location.href);

        if (destino.origin === window.location.origin) {
          salvarScrollAtual();
        }
      } catch {
        return;
      }
    }, true);

    window.addEventListener('beforeunload', salvarScrollAtual);
    document.body.dataset.caigeAbasPersistencia = 'true';
  }

  function inicializar() {
    const { estado, modulo } = registrarModuloAtual();

    criarBarraAbas(estado, modulo);
    vincularRetornoSidebar();
    vincularRetornoAbas();
    vincularPersistencia();

    if (!modulo) {
      return;
    }

    const abaAtual = estado.abas.find((aba) => aba.id === modulo.id);
    const scroll = paginaIgnoraPersistenciaScroll() ? 0 : (abaAtual?.scrollPorUrl?.[urlAtual()] || 0);

    restaurarScroll(scroll);
  }

  window.CAIGEAbasNavegacao = {
    inicializar,
    fecharModulo,
    salvarScrollAtual,
    salvarEstadoModulo,
    obterEstadoModulo,
    obterModuloAtual
  };
})();
