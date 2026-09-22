// =========================================================
// CAIGE - LOGIN
// Lógica exclusiva da tela de autenticação.
// =========================================================

(() => {
  const form =
    document.getElementById('login-form');

  const botao =
    document.getElementById('login-submit');

  const emailInput =
    document.getElementById('login-email');

  const senhaInput =
    document.getElementById('login-password');

  const lembrarInput =
    document.getElementById('login-remember');

  const alternarSenha =
    document.getElementById('login-password-toggle');

  const emailField =
    document.getElementById('login-email-field');

  const senhaField =
    document.getElementById('login-password-field');

  const emailMessage =
    document.getElementById('login-email-message');

  const senhaMessage =
    document.getElementById('login-password-message');

  const formMessage =
    document.getElementById('login-form-message');

  const formMessageText =
    document.getElementById('login-form-message-text');

  const CHAVE_EMAIL_LEMBRADO =
    'rememberedUserEmail';

  if (
    !form ||
    !botao ||
    !emailInput ||
    !senhaInput
  ) {
    console.error(
      'Elementos do formulário de login não encontrados.'
    );

    return;
  }


  function limparSessaoAnterior() {
    if (window.UtilJWT?.limpar) {
      window.UtilJWT.limpar();
      return;
    }

    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userEmail');
    sessionStorage.removeItem('userEmail');
  }


  function restaurarEmailLembrado() {
    const emailSalvo =
      localStorage.getItem(
        CHAVE_EMAIL_LEMBRADO
      );

    if (!emailSalvo) return;

    emailInput.value = emailSalvo;

    if (lembrarInput) {
      lembrarInput.checked = true;
    }
  }


  function alternarVisibilidadeSenha() {
    const mostrando =
      senhaInput.type === 'text';

    senhaInput.type =
      mostrando
        ? 'password'
        : 'text';

    alternarSenha.textContent =
      mostrando
        ? 'Mostrar'
        : 'Ocultar';

    alternarSenha.setAttribute(
      'aria-label',
      mostrando
        ? 'Mostrar senha'
        : 'Ocultar senha'
    );

    alternarSenha.setAttribute(
      'aria-pressed',
      String(!mostrando)
    );
  }


  function esconderMensagemCampo(
    campo,
    mensagem
  ) {
    campo?.classList.remove(
      'login-field--invalid'
    );

    if (mensagem) {
      mensagem.textContent = '';
      mensagem.hidden = true;
    }
  }


  function mostrarMensagemCampo(
    campo,
    mensagem,
    texto
  ) {
    campo?.classList.add(
      'login-field--invalid'
    );

    if (mensagem) {
      mensagem.textContent = texto;
      mensagem.hidden = false;
    }
  }


  function limparMensagemGeral() {
    if (!formMessage) return;

    if (formMessageText) {
      formMessageText.textContent = '';
    }
    formMessage.hidden = true;
  }


  function mostrarMensagemGeral(texto) {
    if (!formMessage) return;

    if (formMessageText) {
      formMessageText.textContent = texto;
    }
    formMessage.hidden = false;
  }


  function limparMensagens() {
    esconderMensagemCampo(
      emailField,
      emailMessage
    );

    esconderMensagemCampo(
      senhaField,
      senhaMessage
    );

    limparMensagemGeral();
  }


  function emailTemFormatoValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
      .test(email);
  }


  function emailInstitucionalValido(email) {
    const normalizado =
      String(email || '')
        .trim()
        .toLowerCase();

    return normalizado.endsWith('@univale.br');
  }


  function validarFormulario() {
    const email =
      emailInput.value.trim();

    const senha =
      senhaInput.value;

    let valido = true;

    limparMensagens();

    if (!email) {
      mostrarMensagemCampo(
        emailField,
        emailMessage,
        'Digite seu e-mail.'
      );

      valido = false;
    } else if (
      !emailTemFormatoValido(email) ||
      !emailInstitucionalValido(email)
    ) {
      mostrarMensagemCampo(
        emailField,
        emailMessage,
        'Utilize seu e-mail institucional.'
      );

      valido = false;
    }

    if (!senha) {
      mostrarMensagemCampo(
        senhaField,
        senhaMessage,
        'Digite sua senha.'
      );

      valido = false;
    }

    return valido;
  }


  function mensagemDoBackend(
    resposta,
    dados
  ) {
    const mensagem =
      String(
        dados?.message ||
        dados?.mensagem ||
        ''
      ).trim();

    const normalizada =
      mensagem.toLowerCase();

    if (
      resposta.status === 401 ||
      resposta.status === 403 ||
      normalizada.includes('credencial') ||
      normalizada.includes('senha inválida') ||
      normalizada.includes('senha invalida') ||
      normalizada.includes('usuário ou senha') ||
      normalizada.includes('usuario ou senha') ||
      normalizada.includes('email ou senha') ||
      normalizada.includes('e-mail ou senha')
    ) {
      return 'E-mail ou senha incorretos.';
    }

    if (
      normalizada.includes('institucional') ||
      normalizada.includes('@univale.br')
    ) {
      return 'Utilize seu e-mail institucional.';
    }

    return (
      mensagem ||
      'Não foi possível entrar no sistema.'
    );
  }


  alternarSenha?.addEventListener(
    'click',
    alternarVisibilidadeSenha
  );


  emailInput.addEventListener(
    'input',
    () => {
      esconderMensagemCampo(
        emailField,
        emailMessage
      );

      limparMensagemGeral();
    }
  );


  senhaInput.addEventListener(
    'input',
    () => {
      esconderMensagemCampo(
        senhaField,
        senhaMessage
      );

      limparMensagemGeral();
    }
  );


  form.addEventListener(
    'submit',
    async (evento) => {
      evento.preventDefault();

      if (!validarFormulario()) {
        return;
      }

      const email =
        emailInput.value.trim().toLowerCase();

      const senha =
        senhaInput.value;

      const lembrarEmail =
        Boolean(
          lembrarInput?.checked
        );

      botao.disabled = true;

      const textoOriginal =
        botao.textContent;

      botao.textContent =
        'Entrando...';

      try {
        const resposta =
          await fetch(
            '/api/autenticacao/entrar',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body: JSON.stringify({
                email,
                password: senha
              })
            }
          );

        let dados = {};

        try {
          dados =
            await resposta.json();
        } catch {
          dados = {};
        }

        if (!resposta.ok) {
          const mensagem =
            mensagemDoBackend(
              resposta,
              dados
            );

          if (
            mensagem ===
            'Utilize seu e-mail institucional.'
          ) {
            mostrarMensagemCampo(
              emailField,
              emailMessage,
              mensagem
            );
          } else {
            mostrarMensagemGeral(
              mensagem
            );
          }

          return;
        }

        const emailResolvido =
          dados?.user?.email ||
          email;

        localStorage.setItem(
          'userEmail',
          emailResolvido
        );

        sessionStorage.setItem(
          'userEmail',
          emailResolvido
        );

        if (dados?.accessToken) {
          localStorage.setItem(
            'jwtToken',
            dados.accessToken
          );
        }

        if (lembrarEmail) {
          localStorage.setItem(
            CHAVE_EMAIL_LEMBRADO,
            emailResolvido
          );
        } else {
          localStorage.removeItem(
            CHAVE_EMAIL_LEMBRADO
          );
        }

        window.location.replace(
          '../painel/painel.html'
        );
      } catch (erro) {
        console.error(
          'Erro ao autenticar:',
          erro
        );

        mostrarMensagemGeral(
          'Erro ao conectar com o servidor. Tente novamente.'
        );
      } finally {
        botao.disabled = false;
        botao.textContent =
          textoOriginal;
      }
    }
  );


  window.addEventListener(
    'DOMContentLoaded',
    () => {
      limparSessaoAnterior();
      restaurarEmailLembrado();
      limparMensagens();
    }
  );
})();
