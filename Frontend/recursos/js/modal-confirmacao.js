// =========================================================
// CAIGE - SISTEMA GLOBAL DE MODAL DE CONFIRMAÇÃO
// =========================================================
// API Pública Oficial:
//   await window.ModalConfirmacao.confirmar({
//     titulo: 'Título da Ação',
//     mensagem: 'Explicação clara da decisão a ser tomada.',
//     variante: 'primaria' | 'aviso' | 'sucesso' | 'perigo',
//     textoConfirmar: 'Confirmar',
//     textoCancelar: 'Cancelar',
//     icone: 'excluir' | 'alerta' | 'sucesso' | 'informacao' | 'arquivar' | 'recuperar' | 'sair'
//   });
// Retorno: Promise<boolean> (true = confirmou, false = cancelou)
// =========================================================

(function () {
  let modalAtivo = false;
  let elementoAnteriorFoco = null;
  let resolverPromiseAtual = null;
  let timerFechamento = null;

  function obterIconePadrao(variante, iconeCustomizado) {
    if (iconeCustomizado) return iconeCustomizado;
    switch (variante) {
      case 'perigo':
        return 'excluir';
      case 'sucesso':
        return 'sucesso';
      case 'aviso':
        return 'alerta';
      case 'primaria':
      default:
        return 'informacao';
    }
  }

  function obterSvgIcone(nome) {
    if (window.IconesCAIGE && typeof window.IconesCAIGE.obterSvg === 'function') {
      return window.IconesCAIGE.obterSvg(nome);
    }
    return '';
  }

  function obterOuCriarModalDOM() {
    let overlay = document.getElementById('caige-modal-confirmacao-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'caige-modal-confirmacao-overlay';
    overlay.className = 'modal modal-overlay modal-confirmacao-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'caige-modal-confirmacao-titulo');
    overlay.setAttribute('aria-describedby', 'caige-modal-confirmacao-mensagem');
    overlay.hidden = true;

    overlay.innerHTML = `
      <div class="modal__content modal-confirmacao__card" role="document">
        <div class="modal-confirmacao__header">
          <div class="modal-confirmacao__icone-wrap" id="caige-modal-confirmacao-icone" aria-hidden="true"></div>
          <h2 class="modal-confirmacao__titulo" id="caige-modal-confirmacao-titulo"></h2>
          <button type="button" class="modal-confirmacao__fechar" id="caige-modal-confirmacao-fechar" aria-label="Fechar diálogo">
            ${obterSvgIcone('fechar')}
          </button>
        </div>
        <div class="modal-confirmacao__body">
          <p class="modal-confirmacao__mensagem" id="caige-modal-confirmacao-mensagem"></p>
        </div>
        <div class="modal-confirmacao__acoes">
          <button type="button" class="modal__btn modal__btn--cancel" id="caige-modal-confirmacao-btn-cancelar">Cancelar</button>
          <button type="button" class="modal__btn" id="caige-modal-confirmacao-btn-confirmar">Confirmar</button>
        </div>
      </div>
    `;

    const destino = document.body || document.documentElement;
    destino.appendChild(overlay);
    return overlay;
  }

  function fecharEResolver(overlay, resultado) {
    if (!modalAtivo) return;
    modalAtivo = false;

    if (timerFechamento) {
      window.clearTimeout(timerFechamento);
      timerFechamento = null;
    }

    overlay.classList.remove('active', 'modal--open');
    overlay.classList.add('is-exiting');

    const btnConfirmar = document.getElementById('caige-modal-confirmacao-btn-confirmar');
    const btnCancelar = document.getElementById('caige-modal-confirmacao-btn-cancelar');
    if (btnConfirmar) btnConfirmar.disabled = true;
    if (btnCancelar) btnCancelar.disabled = true;

    const elementoFoco = elementoAnteriorFoco;
    elementoAnteriorFoco = null;

    const resolver = resolverPromiseAtual;
    resolverPromiseAtual = null;

    timerFechamento = window.setTimeout(() => {
      timerFechamento = null;
      if (!modalAtivo) {
        overlay.hidden = true;
        overlay.classList.remove('is-exiting');
      }
      if (btnConfirmar) btnConfirmar.disabled = false;
      if (btnCancelar) btnCancelar.disabled = false;

      // Restauração de foco ao elemento disparador original
      if (elementoFoco && typeof elementoFoco.focus === 'function') {
        try {
          elementoFoco.focus();
        } catch (_) {}
      }
    }, 150);

    if (resolver) {
      resolver(resultado);
    }
  }

  function confirmar(opcoes = {}) {
    const {
      titulo = 'Confirmação',
      mensagem = 'Deseja prosseguir com esta ação?',
      variante = 'primaria',
      textoConfirmar = 'Confirmar',
      textoCancelar = 'Cancelar',
      icone = null
    } = opcoes;

    // Se já houver um diálogo aberto, cancela o anterior com false
    if (modalAtivo && resolverPromiseAtual) {
      const overlayAntigo = document.getElementById('caige-modal-confirmacao-overlay');
      if (overlayAntigo) fecharEResolver(overlayAntigo, false);
    }

    if (timerFechamento) {
      window.clearTimeout(timerFechamento);
      timerFechamento = null;
    }

    return new Promise((resolve) => {
      resolverPromiseAtual = resolve;
      modalAtivo = true;
      elementoAnteriorFoco = document.activeElement;

      const overlay = obterOuCriarModalDOM();
      overlay.classList.remove('is-exiting');
      const card = overlay.querySelector('.modal-confirmacao__card');
      const iconeWrap = document.getElementById('caige-modal-confirmacao-icone');
      const tituloEl = document.getElementById('caige-modal-confirmacao-titulo');
      const mensagemEl = document.getElementById('caige-modal-confirmacao-mensagem');
      const btnConfirmar = document.getElementById('caige-modal-confirmacao-btn-confirmar');
      const btnCancelar = document.getElementById('caige-modal-confirmacao-btn-cancelar');
      const btnFechar = document.getElementById('caige-modal-confirmacao-fechar');

      // 1. Variante de estilo no card
      card.className = `modal__content modal-confirmacao__card modal-confirmacao--${variante}`;

      // 2. Ícone semântico
      const nomeIcone = obterIconePadrao(variante, icone);
      const svgIcone = obterSvgIcone(nomeIcone);
      iconeWrap.innerHTML = svgIcone;
      iconeWrap.className = `modal-confirmacao__icone-wrap modal-confirmacao__icone--${variante}`;

      // Atualiza também o ícone do botão fechar se necessário
      if (btnFechar && !btnFechar.querySelector('svg')) {
        btnFechar.innerHTML = obterSvgIcone('fechar');
      }

      // 3. Atualizar textos com textContent seguro (prevenção contra XSS)
      tituloEl.textContent = String(titulo);
      mensagemEl.textContent = String(mensagem);
      btnConfirmar.textContent = String(textoConfirmar);
      btnCancelar.textContent = String(textoCancelar);

      // 4. Estilização semântica do botão de confirmação
      btnConfirmar.className = 'modal__btn modal-confirmacao__btn-confirmar';
      switch (variante) {
        case 'perigo':
          btnConfirmar.classList.add('modal__btn--danger');
          break;
        case 'sucesso':
          btnConfirmar.classList.add('modal__btn--success');
          break;
        case 'aviso':
          btnConfirmar.classList.add('modal__btn--warning');
          break;
        case 'primaria':
        default:
          btnConfirmar.classList.add('modal__btn--primary');
          break;
      }

      // Habilitar botões
      btnConfirmar.disabled = false;
      btnCancelar.disabled = false;

      // 5. Tratamento de eventos com resolução única garantida
      const onConfirmar = (e) => {
        e.preventDefault();
        e.stopPropagation();
        desvincularEventos();
        fecharEResolver(overlay, true);
      };

      const onCancelar = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        desvincularEventos();
        fecharEResolver(overlay, false);
      };

      const onKeyDown = (e) => {
        if (!modalAtivo) return;

        // Escape fecha cancelando
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancelar(e);
          return;
        }

        // Focus Trap para navegação com Tab
        if (e.key === 'Tab') {
          const focaveis = Array.from(
            card.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])')
          );
          if (focaveis.length === 0) return;

          const primeiro = focaveis[0];
          const ultimo = focaveis[focaveis.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === primeiro) {
              e.preventDefault();
              ultimo.focus();
            }
          } else {
            if (document.activeElement === ultimo) {
              e.preventDefault();
              primeiro.focus();
            }
          }
        }
      };

      const onBackdropClick = (e) => {
        if (e.target === overlay) {
          onCancelar(e);
        }
      };

      function desvincularEventos() {
        btnConfirmar.removeEventListener('click', onConfirmar);
        btnCancelar.removeEventListener('click', onCancelar);
        btnFechar.removeEventListener('click', onCancelar);
        overlay.removeEventListener('click', onBackdropClick);
        document.removeEventListener('keydown', onKeyDown, true);
      }

      btnConfirmar.addEventListener('click', onConfirmar);
      btnCancelar.addEventListener('click', onCancelar);
      btnFechar.addEventListener('click', onCancelar);
      overlay.addEventListener('click', onBackdropClick);
      document.addEventListener('keydown', onKeyDown, true);

      // 6. Exibir diálogo
      overlay.hidden = false;
      overlay.classList.add('active', 'modal--open');

      // 7. Foco inicial seguro
      // Variante PERIGO: foco inicial OBRIGATORIAMENTE no botão Cancelar
      // Demais variantes: foco no botão Confirmar
      const definirFocoInicial = () => {
        if (variante === 'perigo') {
          btnCancelar.focus();
        } else {
          btnConfirmar.focus();
        }
      };
      definirFocoInicial();
      requestAnimationFrame(definirFocoInicial);
    });
  }

  window.ModalConfirmacao = Object.freeze({
    confirmar
  });
})();
