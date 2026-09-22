// =========================================================
// CAIGE - REDIMENSIONAMENTO GLOBAL DE GRIDS
// =========================================================
//
// Permite ajustar a largura das colunas no desktop.
// Compatível com:
// - <table class="data-table">
// - <div class="data-grid">
//
// As preferências são persistidas no localStorage.
// Em telas menores que 768px o recurso é desativado.
// =========================================================

(() => {
  const LARGURA_MINIMA = 72;
  const BREAKPOINT_DESKTOP = 768;
  const PREFIXO_STORAGE = 'caige:grid-colunas:';

  const ehDesktop = () => window.innerWidth >= BREAKPOINT_DESKTOP;

  function chaveDoGrid(grid) {
    const id = grid.dataset.gridId || grid.id;

    return id
      ? `${PREFIXO_STORAGE}${id}`
      : null;
  }

  function lerLarguras(grid) {
    const chave = chaveDoGrid(grid);

    if (!chave) return null;

    try {
      const valor = JSON.parse(localStorage.getItem(chave) || 'null');

      if (
        !Array.isArray(valor) ||
        !valor.every((item) => Number.isFinite(Number(item)))
      ) {
        return null;
      }

      return valor.map(Number);
    } catch {
      return null;
    }
  }

  function salvarLarguras(grid, larguras) {
    const chave = chaveDoGrid(grid);

    if (!chave) return;

    localStorage.setItem(
      chave,
      JSON.stringify(
        larguras.map((valor) => Math.round(valor))
      )
    );
  }

  function cabecalhoDoGrid(grid) {
    if (grid.matches('table.data-table')) {
      return Array.from(
        grid.querySelectorAll('thead th')
      );
    }

    const header =
      grid.querySelector('.data-grid__header');

    if (!header) return [];

    return Array.from(
      header.querySelectorAll(
        ':scope > .data-grid__cell'
      )
    );
  }

  function removerHandles(grid) {
    grid
      .querySelectorAll('.data-grid-resize-handle')
      .forEach((handle) => handle.remove());
  }

  function garantirColgroup(table, quantidade) {
    let colgroup =
      table.querySelector(
        ':scope > colgroup[data-grid-colgroup]'
      );

    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      colgroup.dataset.gridColgroup = 'true';

      table.insertBefore(
        colgroup,
        table.firstChild
      );
    }

    while (colgroup.children.length < quantidade) {
      colgroup.appendChild(
        document.createElement('col')
      );
    }

    while (colgroup.children.length > quantidade) {
      colgroup.lastElementChild.remove();
    }

    return Array.from(colgroup.children);
  }

  function aplicarLargurasTabela(table, larguras) {
    const colunas =
      garantirColgroup(table, larguras.length);

    colunas.forEach((coluna, indice) => {
      coluna.style.width =
        `${Math.round(larguras[indice])}px`;
    });
  }

  function aplicarLargurasDataGrid(grid, larguras) {
    const template =
      larguras
        .map(
          (largura) =>
            `${Math.round(largura)}px`
        )
        .join(' ');

    grid.style.setProperty(
      '--data-grid-columns',
      template
    );
  }

  function aplicarLarguras(grid, larguras) {
    if (!ehDesktop()) return;

    if (grid.matches('table.data-table')) {
      aplicarLargurasTabela(
        grid,
        larguras
      );

      return;
    }

    aplicarLargurasDataGrid(
      grid,
      larguras
    );
  }

  function obterLarguraDisponivel(grid) {
    const container =
      grid.parentElement;

    return (
      container?.getBoundingClientRect?.().width ||
      grid.getBoundingClientRect().width ||
      0
    );
  }

  function largurasCabemNoContainer(grid, larguras) {
    const larguraDisponivel =
      obterLarguraDisponivel(grid);

    if (!larguraDisponivel) {
      return true;
    }

    const total =
      larguras.reduce(
        (soma, largura) => soma + largura,
        0
      );

    return total <= larguraDisponivel + 1;
  }

  function limparLargurasTemporarias(grid) {
    if (grid.matches('table.data-table')) {
      grid
        .querySelectorAll(
          ':scope > colgroup[data-grid-colgroup] col'
        )
        .forEach((coluna) => {
          coluna.style.width = '';
        });

      return;
    }

    grid.style.removeProperty(
      '--data-grid-columns'
    );
  }

  function largurasAtuais(grid) {
    return cabecalhoDoGrid(grid).map(
      (celula) =>
        celula.getBoundingClientRect().width
    );
  }

  function adicionarHandles(grid) {
    removerHandles(grid);

    const colunas = cabecalhoDoGrid(grid);

    if (colunas.length < 2) return;

    colunas
      .slice(0, -1)
      .forEach((celula, indice) => {
        const handle =
          document.createElement('span');

        handle.className =
          'data-grid-resize-handle';

        handle.setAttribute(
          'role',
          'separator'
        );

        handle.setAttribute(
          'aria-orientation',
          'vertical'
        );

        handle.setAttribute(
          'aria-label',
          'Redimensionar coluna'
        );

        handle.dataset.indice =
          String(indice);

        handle.addEventListener(
          'pointerdown',
          (evento) => {
            if (!ehDesktop()) return;

            evento.preventDefault();

            const largurasOriginais =
              largurasAtuais(grid);

            const indiceAtual =
              Number(handle.dataset.indice);

            const indiceSeguinte =
              indiceAtual + 1;

            const larguraAtualOriginal =
              largurasOriginais[indiceAtual];

            const larguraSeguinteOriginal =
              largurasOriginais[indiceSeguinte];

            const larguraDoPar =
              larguraAtualOriginal +
              larguraSeguinteOriginal;

            const inicioX =
              evento.clientX;

            handle.setPointerCapture?.(
              evento.pointerId
            );

            handle.classList.add(
              'data-grid-resize-handle--active'
            );

            document.body.classList.add(
              'data-grid--resizing'
            );

            const aoMover = (movimento) => {
              const delta =
                movimento.clientX - inicioX;

              let novaAtual =
                larguraAtualOriginal + delta;

              novaAtual = Math.max(
                LARGURA_MINIMA,
                Math.min(
                  larguraDoPar - LARGURA_MINIMA,
                  novaAtual
                )
              );

              const novaSeguinte =
                larguraDoPar - novaAtual;

              const novas =
                [...largurasOriginais];

              novas[indiceAtual] =
                novaAtual;

              novas[indiceSeguinte] =
                novaSeguinte;

              aplicarLarguras(
                grid,
                novas
              );
            };

            const aoFinalizar = () => {
              handle.classList.remove(
                'data-grid-resize-handle--active'
              );

              document.body.classList.remove(
                'data-grid--resizing'
              );

              window.removeEventListener(
                'pointermove',
                aoMover
              );

              salvarLarguras(
                grid,
                largurasAtuais(grid)
              );
            };

            window.addEventListener(
              'pointermove',
              aoMover
            );

            window.addEventListener(
              'pointerup',
              aoFinalizar,
              { once: true }
            );
          }
        );

        celula.appendChild(handle);
      });
  }

  function inicializarGrid(grid) {
    if (!grid) return;

    if (
      grid.dataset.gridRedimensionavel !==
      'true'
    ) {
      return;
    }

    const header =
      cabecalhoDoGrid(grid);

    if (header.length < 2) return;

    if (
      grid.dataset.gridResizeInicializado !==
      'true'
    ) {
      grid.dataset.gridResizeInicializado =
        'true';

      adicionarHandles(grid);
    }

    const salvas =
      lerLarguras(grid);

    if (
      ehDesktop() &&
      salvas?.length === header.length
    ) {
      if (
        !largurasCabemNoContainer(
          grid,
          salvas
        )
      ) {
        limparLargurasTemporarias(grid);
        return;
      }

      aplicarLarguras(
        grid,
        salvas
      );
    }
  }

  function inicializarTodos() {
    document
      .querySelectorAll(
        '[data-grid-redimensionavel="true"]'
      )
      .forEach(inicializarGrid);
  }

  function atualizarPorBreakpoint() {
    document
      .querySelectorAll(
        '[data-grid-redimensionavel="true"]'
      )
      .forEach((grid) => {
        if (!ehDesktop()) {
          limparLargurasTemporarias(grid);
          return;
        }

        const salvas =
          lerLarguras(grid);

        const total =
          cabecalhoDoGrid(grid).length;

        if (
          salvas?.length === total
        ) {
          if (
            !largurasCabemNoContainer(
              grid,
              salvas
            )
          ) {
            limparLargurasTemporarias(grid);
            return;
          }

          aplicarLarguras(
            grid,
            salvas
          );
        }
      });
  }

  const observer =
    new MutationObserver(() => {
      inicializarTodos();
    });

  function iniciar() {
    inicializarTodos();

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    window.addEventListener(
      'resize',
      atualizarPorBreakpoint,
      { passive: true }
    );
  }

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      iniciar,
      { once: true }
    );
  } else {
    iniciar();
  }

  window.RedimensionadorGrid = {
    inicializarTodos,

    limparPreferencias(gridId) {
      localStorage.removeItem(
        `${PREFIXO_STORAGE}${gridId}`
      );
    }
  };
})();
