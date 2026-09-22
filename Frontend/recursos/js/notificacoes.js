// =========================================================
// CAIGE - SISTEMA GLOBAL DE NOTIFICAÇÕES (TOASTS)
// =========================================================
// API Pública Oficial:
//   window.notify.show(mensagem, tipo, duracao)
//   window.notify.success(mensagem, duracao)
//   window.notify.error(mensagem, duracao)
//   window.notify.warning(mensagem, duracao)
//   window.notify.info(mensagem, duracao)
//   window.notify.remove(elemento)
// =========================================================

(function () {
  const LIMITE_TOASTS = 4;
  const DURACAO_PADRAO = 5000;

  class NotificationSystem {
    constructor() {
      this.container = null;
      this.notifications = [];
    }

    _obterContainer() {
      if (this.container && document.body && document.body.contains(this.container)) {
        return this.container;
      }

      let container = document.getElementById('notification-container');
      if (!container && document.body) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
      }

      this.container = container;
      return this.container;
    }

    _obterIconeSvg(tipo) {
      const mapaIcones = {
        success: 'sucesso',
        error: 'erro',
        warning: 'alerta',
        info: 'informacao'
      };

      const nomeIcone = mapaIcones[tipo] || 'informacao';
      if (window.IconesCAIGE && typeof window.IconesCAIGE.obterSvg === 'function') {
        const svgRegistrado = window.IconesCAIGE.obterSvg(nomeIcone);
        if (svgRegistrado) return svgRegistrado;
      }

      // Fallback visual: garante o ícone mesmo em páginas com cache antigo
      // do registro global de SVGs.
      const desenhos = {
        success: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 5-5"/>',
        error: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
        warning: '<path d="M10.3 3.6 2.4 17.3A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.7L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/>'
      };

      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${desenhos[tipo] || desenhos.info}</svg>`;
    }

    _obterIconeFechar() {
      if (window.IconesCAIGE && typeof window.IconesCAIGE.obterSvg === 'function') {
        const svgRegistrado = window.IconesCAIGE.obterSvg('fechar');
        if (svgRegistrado) return svgRegistrado;
      }

      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>';
    }

    show(message, type = 'info', duration = DURACAO_PADRAO) {
      const container = this._obterContainer();
      if (!container) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            this.show(message, type, duration);
          }, { once: true });
        }
        return null;
      }

      // Limitar empilhamento a no máximo 4 toasts
      while (this.notifications.length >= LIMITE_TOASTS) {
        const maisAntigo = this.notifications[0];
        if (maisAntigo && maisAntigo.element) {
          this.remove(maisAntigo.element, true);
        } else {
          this.notifications.shift();
        }
      }

      const duracaoNumerica = Number(duration);
      const temAutoFechamento = Number.isFinite(duracaoNumerica) && duracaoNumerica > 0;
      const tempoTotal = temAutoFechamento ? duracaoNumerica : 0;

      // Acessibilidade WAI-ARIA
      const isAlerta = type === 'error' || type === 'warning';
      const role = isAlerta ? 'alert' : 'status';
      const ariaLive = isAlerta ? 'assertive' : 'polite';

      const toast = document.createElement('div');
      toast.className = `notification notification--${type} toast toast--${type}`;
      toast.setAttribute('role', role);
      toast.setAttribute('aria-live', ariaLive);
      toast.setAttribute('aria-atomic', 'true');

      const reduzirMovimento =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

      if (!reduzirMovimento) {
        toast.classList.add('is-entering');

        const finalizarEntrada = (evento) => {
          if (
            evento.target === toast &&
            evento.animationName === 'caige-toast-enter'
          ) {
            toast.classList.remove('is-entering');
            toast.removeEventListener('animationend', finalizarEntrada);
          }
        };

        toast.addEventListener('animationend', finalizarEntrada);
      }

      // 1. Ícone Semântico SVG
      const iconeWrap = document.createElement('span');
      iconeWrap.className = 'toast__icon';
      iconeWrap.setAttribute('aria-hidden', 'true');
      const svgIcone = this._obterIconeSvg(type);
      if (svgIcone) {
        iconeWrap.innerHTML = svgIcone;
      }
      toast.appendChild(iconeWrap);

      // 2. Mensagem segura (textContent para evitar XSS)
      const contentWrap = document.createElement('div');
      contentWrap.className = 'toast__content';
      const msgSpan = document.createElement('span');
      msgSpan.className = 'notification__message toast__message';
      msgSpan.textContent = String(message ?? '');
      contentWrap.appendChild(msgSpan);
      toast.appendChild(contentWrap);

      // 3. Botão Fechar
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'notification__close toast__close';
      closeBtn.setAttribute('aria-label', 'Fechar notificação');
      const svgFechar = this._obterIconeFechar();
      if (typeof svgFechar === 'string' && svgFechar.includes('<svg')) {
        closeBtn.innerHTML = svgFechar;
      }
      toast.appendChild(closeBtn);

      // 4. Barra de Progresso Inferior
      let progressBar = null;
      if (temAutoFechamento) {
        const progressWrap = document.createElement('div');
        progressWrap.className = 'toast__progress';
        progressBar = document.createElement('div');
        progressBar.className = 'toast__progress-bar';
        progressBar.style.animationDuration = `${tempoTotal}ms`;
        progressWrap.appendChild(progressBar);
        toast.appendChild(progressWrap);
      }

      // Registro do Toast e Temporizador
      const registro = {
        element: toast,
        timerId: null,
        tempoTotal,
        tempoRestante: tempoTotal,
        inicioTimer: Date.now(),
        pausado: false
      };

      const iniciarTimer = (tempo) => {
        if (!temAutoFechamento || tempo <= 0) return;
        registro.inicioTimer = Date.now();
        registro.timerId = window.setTimeout(() => {
          this.remove(toast);
        }, tempo);
      };

      const pausarTimer = () => {
        if (!temAutoFechamento || registro.pausado) return;
        window.clearTimeout(registro.timerId);
        registro.timerId = null;
        const decorrido = Date.now() - registro.inicioTimer;
        registro.tempoRestante = Math.max(0, registro.tempoRestante - decorrido);
        registro.pausado = true;
        toast.classList.add('is-paused');
      };

      const retomarTimer = () => {
        if (!temAutoFechamento || !registro.pausado) return;
        registro.pausado = false;
        toast.classList.remove('is-paused');
        iniciarTimer(registro.tempoRestante);
      };

      toast.addEventListener('mouseenter', pausarTimer);
      toast.addEventListener('mouseleave', retomarTimer);

      closeBtn.addEventListener('click', (evento) => {
        evento.stopPropagation();
        this.remove(toast);
      });

      container.appendChild(toast);
      this.notifications.push(registro);

      if (temAutoFechamento) {
        iniciarTimer(tempoTotal);
      }

      return toast;
    }

    remove(notificationElement, imediato = false) {
      if (!notificationElement) return;

      const idx = this.notifications.findIndex((n) => n.element === notificationElement);
      let registro = null;
      if (idx !== -1) {
        registro = this.notifications[idx];
        this.notifications.splice(idx, 1);
      }

      if (registro && registro.timerId) {
        window.clearTimeout(registro.timerId);
        registro.timerId = null;
      }

      if (imediato) {
        if (notificationElement.parentNode) {
          notificationElement.parentNode.removeChild(notificationElement);
        }
        return;
      }

      notificationElement.classList.add('removing', 'is-exiting');
      window.setTimeout(() => {
        if (notificationElement.parentNode) {
          notificationElement.parentNode.removeChild(notificationElement);
        }
      }, 200);
    }

    success(message, duration = DURACAO_PADRAO) {
      return this.show(message, 'success', duration);
    }

    error(message, duration = DURACAO_PADRAO) {
      return this.show(message, 'error', duration);
    }

    warning(message, duration = DURACAO_PADRAO) {
      return this.show(message, 'warning', duration);
    }

    info(message, duration = DURACAO_PADRAO) {
      return this.show(message, 'info', duration);
    }
  }

  window.NotificationSystem = NotificationSystem;
  window.notify = new NotificationSystem();
})();
