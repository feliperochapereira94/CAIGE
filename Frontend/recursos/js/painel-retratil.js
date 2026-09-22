// =========================================================
// CAIGE - PAINEL RETRÁTIL
// =========================================================
// Componente compartilhado para painéis com cabeçalho clicável,
// controle por chevron e estado preservado somente na aba atual.
// =========================================================

class PainelRetratil {
  constructor(elemento, opcoes = {}) {
    this.elemento = elemento;
    this.cabecalho = elemento?.querySelector('[data-painel-retratil-header]') || elemento?.querySelector('[data-painel-retratil-toggle]');
    this.botao = elemento?.querySelector('[data-painel-retratil-toggle]');
    this.conteudo = elemento?.querySelector('[data-painel-retratil-content]');
    this.chaveEstado = opcoes.chaveEstado || null;
    this.abertoInicial = opcoes.abertoInicial !== false;
    this.rotulo = opcoes.rotulo || elemento?.dataset.painelRetratilRotulo || 'painel';

    if (!this.elemento || !this.cabecalho || !this.botao || !this.conteudo) {
      throw new Error('Estrutura inválida para PainelRetratil');
    }

    this._vincularEventos();
    this.restaurarEstado();
  }

  _vincularEventos() {
    this.botao.addEventListener('click', (evento) => {
      evento.stopPropagation();
      this.alternar();
    });

    if (this.cabecalho && this.cabecalho !== this.botao) {
      this.cabecalho.addEventListener('click', (evento) => {
        if (evento.target.closest('a, button, input, select, textarea, [role="button"]')) {
          return;
        }

        this.alternar();
      });
    }
  }

  _lerEstado() {
    if (!this.chaveEstado) return null;

    try {
      return sessionStorage.getItem(this.chaveEstado);
    } catch {
      return null;
    }
  }

  _salvarEstado(estaAberto) {
    if (!this.chaveEstado) return;

    try {
      sessionStorage.setItem(this.chaveEstado, estaAberto ? 'aberto' : 'fechado');
    } catch {
      // O painel continua funcional mesmo sem armazenamento disponível.
    }
  }

  definirAberto(aberto, persistir = true) {
    const estaAberto = Boolean(aberto);

    this.elemento.classList.toggle('is-collapsed', !estaAberto);
    this.elemento.classList.toggle('open', estaAberto);
    this.botao.setAttribute('aria-expanded', estaAberto ? 'true' : 'false');
    this.botao.setAttribute(
      'aria-label',
      `${estaAberto ? 'Recolher' : 'Expandir'} ${this.rotulo}`
    );
    this.botao.title = estaAberto ? 'Recolher' : 'Expandir';

    if (persistir) {
      this._salvarEstado(estaAberto);
    }
  }

  alternar() {
    const estaAberto = this.botao.getAttribute('aria-expanded') === 'true';
    this.definirAberto(!estaAberto);
  }

  restaurarEstado() {
    const estadoSalvo = this._lerEstado();

    if (estadoSalvo === 'aberto' || estadoSalvo === 'fechado') {
      this.definirAberto(estadoSalvo === 'aberto', false);
      return;
    }

    this.definirAberto(this.abertoInicial, false);
  }

  static inicializar(alvo, opcoes = {}) {
    const elemento = typeof alvo === 'string'
      ? document.querySelector(alvo)
      : alvo;

    if (!elemento) {
      return null;
    }

    return new PainelRetratil(elemento, opcoes);
  }
}

window.PainelRetratil = PainelRetratil;
