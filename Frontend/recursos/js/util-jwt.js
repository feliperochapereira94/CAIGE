// =========================================================
// CAIGE - AUTENTICAÇÃO CENTRALIZADA
// =========================================================
//
// Responsabilidades:
// - ler e validar o JWT;
// - restaurar a identidade do usuário a partir do token;
// - adicionar Authorization em TODAS as chamadas /api/*;
// - tratar token expirado/inválido;
// - limpar a sessão de forma única;
// - redirecionar para o login quando necessário.
//
// As páginas não precisam adicionar Authorization manualmente.
// =========================================================

class UtilJWT {
  static CHAVE_TOKEN = 'jwtToken';
  static CHAVE_EMAIL = 'userEmail';
  static REDIRECIONANDO = false;

  static obterToken() {
    return localStorage.getItem(this.CHAVE_TOKEN) || '';
  }

  static decodificar(token = this.obterToken()) {
    try {
      if (!token || typeof token !== 'string') return null;

      const partes = token.split('.');
      if (partes.length !== 3) return null;

      // JWT usa Base64URL, não Base64 puro.
      let payload = partes[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      while (payload.length % 4) {
        payload += '=';
      }

      const binario = atob(payload);
      const bytes = Uint8Array.from(
        binario,
        (caractere) => caractere.charCodeAt(0)
      );

      const texto = new TextDecoder('utf-8').decode(bytes);
      return JSON.parse(texto);
    } catch (erro) {
      console.error('Erro ao decodificar JWT:', erro);
      return null;
    }
  }

  static obterUsuario() {
    const payload = this.decodificar();

    if (!payload) return null;

    return {
      idUsuario: payload.idUsuario ?? payload.id ?? null,
      email: payload.email || '',
      nome: payload.nome || payload.name || '',
      papel: payload.papel || payload.role || '',
      idCurso: payload.idCurso ?? payload.course_id ?? null,
      exp: payload.exp ?? null
    };
  }

  static eValido() {
    const token = this.obterToken();

    if (!token) return false;

    const payload = this.decodificar(token);

    if (!payload) return false;

    if (payload.exp) {
      const agora = Math.floor(Date.now() / 1000);

      // Pequena margem para não iniciar uma requisição com
      // um token que expira praticamente no mesmo instante.
      return payload.exp > agora + 5;
    }

    return true;
  }

  static sincronizarIdentidade() {
    const usuario = this.obterUsuario();

    if (!usuario?.email) {
      return null;
    }

    localStorage.setItem(this.CHAVE_EMAIL, usuario.email);
    sessionStorage.setItem(this.CHAVE_EMAIL, usuario.email);

    return usuario;
  }

  static obterHeaderAutorizacao() {
    const token = this.obterToken();

    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  }

  static obterHeaders(headersIniciais = {}) {
    const headers = new Headers(headersIniciais || {});

    const token = this.obterToken();

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const usuario = this.obterUsuario();
    const email =
      usuario?.email ||
      localStorage.getItem(this.CHAVE_EMAIL) ||
      sessionStorage.getItem(this.CHAVE_EMAIL);

    if (email && !headers.has('x-user-email')) {
      headers.set('x-user-email', email);
    }

    return headers;
  }

  static limpar() {
    localStorage.removeItem(this.CHAVE_TOKEN);
    localStorage.removeItem(this.CHAVE_EMAIL);

    sessionStorage.removeItem(this.CHAVE_EMAIL);
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userPapel');
    sessionStorage.removeItem('userIdCurso');

    // Limpar estados temporários de sessão gerenciados pelo CAIGE
    if (typeof EstadoSessao !== 'undefined' && typeof EstadoSessao.limparTudo === 'function') {
      try {
        EstadoSessao.limparTudo();
      } catch {
        // Falha segura
      }
    }
  }

  static obterUrlLogin() {
    const caminho = window.location.pathname || '';

    // Todas as páginas internas atualmente ficam em
    // /paginas/<grupo>/<arquivo>.html.
    if (caminho.includes('/paginas/')) {
      return '../../paginas/autenticacao/entrar.html';
    }

    return '/paginas/autenticacao/entrar.html';
  }

  static redirecionarParaLogin(motivo = '') {
    if (this.REDIRECIONANDO) return;

    this.REDIRECIONANDO = true;

    if (motivo) {
      sessionStorage.setItem('authMessage', motivo);
    }

    this.limpar();

    window.location.replace(this.obterUrlLogin());
  }

  static exigirSessao() {
    if (!this.eValido()) {
      this.redirecionarParaLogin(
        'Sua sessão expirou. Entre novamente.'
      );
      return false;
    }

    this.sincronizarIdentidade();
    return true;
  }

  static deveAnexarToken(input) {
    try {
      const urlEntrada =
        typeof input === 'string'
          ? input
          : input?.url;

      const url = new URL(
        urlEntrada,
        window.location.origin
      );

      return (
        url.origin === window.location.origin &&
        url.pathname.startsWith('/api/')
      );
    } catch {
      const valor =
        typeof input === 'string'
          ? input
          : input?.url;

      return String(valor || '').startsWith('/api/');
    }
  }

  static instalarFetchAutenticado() {
    if (window.__CAIGE_AUTH_FETCH_INSTALLED__) {
      return;
    }

    window.__CAIGE_AUTH_FETCH_INSTALLED__ = true;

    const fetchOriginal = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
      if (!UtilJWT.deveAnexarToken(input)) {
        return fetchOriginal(input, init);
      }

      const token = UtilJWT.obterToken();

      // A rota de login não carrega este arquivo atualmente,
      // mas esta exceção mantém o helper seguro caso isso mude.
      const urlEntrada =
        typeof input === 'string'
          ? input
          : input?.url || '';

      const urlNormalizada = new URL(
        urlEntrada,
        window.location.origin
      );

      const rotaPublica =
        urlNormalizada.pathname ===
        '/api/autenticacao/entrar';

      if (!rotaPublica) {
        if (!token || !UtilJWT.eValido()) {
          UtilJWT.redirecionarParaLogin(
            'Sua sessão expirou. Entre novamente.'
          );

          // Rejeita localmente para não disparar várias
          // requisições 401 ao mesmo tempo.
          throw new Error('Sessão expirada');
        }
      }

      const headersBase =
        init.headers ||
        (
          input instanceof Request
            ? input.headers
            : {}
        );

      const headers = rotaPublica
        ? new Headers(headersBase)
        : UtilJWT.obterHeaders(headersBase);

      const resposta = await fetchOriginal(
        input,
        {
          ...init,
          headers
        }
      );

      if (
        resposta.status === 401 &&
        !rotaPublica
      ) {
        let mensagem =
          'Sua sessão expirou. Entre novamente.';
        let deveRedirecionar = true;

        try {
          const clone = resposta.clone();
          const dados = await clone.json();

          if (
            dados?.message === 'Senha atual incorreta.' ||
            dados?.message === 'Senha do supervisor inválida.'
          ) {
            deveRedirecionar = false;
          } else if (
            dados?.message &&
            /token|autentic|sess[aã]o/i.test(
              dados.message
            )
          ) {
            mensagem = dados.message;
          }
        } catch {
          // Mantém a mensagem padrão.
        }

        if (deveRedirecionar) {
          UtilJWT.redirecionarParaLogin(mensagem);
        }
      }

      return resposta;
    };
  }
}

// Disponibilizar explicitamente para scripts carregados depois.
window.UtilJWT = UtilJWT;

// Instala uma única vez para TODAS as páginas internas.
UtilJWT.instalarFetchAutenticado();

// Se existe um token válido, ele é a fonte de verdade da sessão.
if (UtilJWT.eValido()) {
  UtilJWT.sincronizarIdentidade();
}
