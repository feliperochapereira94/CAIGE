// =========================================================
// CAIGE - MENU DO USUÁRIO
// =========================================================
// A autenticação HTTP é centralizada em util-jwt.js.
// Este arquivo cuida apenas da interface do usuário.
// =========================================================

if (typeof window.UtilJWT === 'undefined') {
  console.error(
    'UtilJWT não está disponível. Carregue util-jwt.js antes de menu-usuario.js.'
  );
} else {
  // O JWT é a fonte de verdade para restaurar email/sessão.
  window.UtilJWT.sincronizarIdentidade();
}

// Sistema de Menu de Usuário
class UserMenuSystem {
  constructor() {
    this.init();
  }

  applyUserIdentity(userEmail, profile = null) {
    const username = String(userEmail || '').split('@')[0] || 'US';
    const initials = username.substring(0, 2).toUpperCase();
    const rawDisplayName = (profile && (profile.nome || profile.name)) || username;
    const displayName = window.FormatadorTexto ? window.FormatadorTexto.formatarNomePessoa(rawDisplayName) : rawDisplayName;

    const userAvatarEl = document.getElementById('user-avatar');
    const dropdownAvatarEl = document.getElementById('dropdown-avatar');
    const dropdownEmailEl = document.getElementById('dropdown-email');
    const welcomeEl = document.getElementById('user-welcome');

    if (userAvatarEl) userAvatarEl.textContent = initials;
    if (dropdownAvatarEl) dropdownAvatarEl.textContent = initials;
    if (dropdownEmailEl) dropdownEmailEl.textContent = userEmail;
    if (welcomeEl) {
      welcomeEl.textContent = displayName;
    }
  }

  updateManageUsersVisibility(papel) {
    const btnManageUsers = document.getElementById('btn-manage-users');
    if (!btnManageUsers) {
      return;
    }
    btnManageUsers.style.display = papel === 'SUPERVISOR' ? 'block' : 'none';
  }

  async init() {
    this.setupMenuButton();
    this.setupModals();
    this.setupAccountTabs();
    this.setupManageUsersButton();
    await this.loadUserProfile();
  }

  setupAccountTabs() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('.account-tab-btn');
      if (!button) return;
      e.preventDefault();
      const tabName = button.dataset.tab;
      if (!tabName) return;

      document.querySelectorAll('.account-tab-btn').forEach((btn) => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('account-tab-btn--active', isActive);
      });

      document.querySelectorAll('.account__tab').forEach((tab) => {
        const isCurrent = tab.id === `tab-${tabName}`;
        if (isCurrent) {
          tab.classList.remove('account__tab--hidden');
          tab.style.display = 'block';
        } else {
          tab.classList.add('account__tab--hidden');
          tab.style.display = 'none';
        }
      });
    });
  }

  async loadUserProfile() {
    try {
      const token = localStorage.getItem('jwtToken');
      if (!token) { 
        window.location.href = '../../paginas/autenticacao/entrar.html'; 
        return; 
      }

      // Validar que UtilJWT está disponível
      if (typeof UtilJWT === 'undefined') {
        console.error('UtilJWT não está disponível. Verifique se util-jwt.js foi carregado.');
        window.location.href = '../../paginas/autenticacao/entrar.html';
        return;
      }

      // Obter dados do JWT
      const usuario = UtilJWT.obterUsuario();
      if (!usuario) {
        window.location.href = '../../paginas/autenticacao/entrar.html';
        return;
      }

      let perfilAtual = usuario;
      const perfilResponse = await fetch('/api/autenticacao/perfil');
      if (perfilResponse.ok) {
        const perfil = await perfilResponse.json();
        perfilAtual = perfil.user || perfil;
      } else if (perfilResponse.status !== 401) {
        console.warn(
          'Não foi possível atualizar o perfil. Usando dados do JWT.'
        );
      }

      // O JWT autentica; o perfil atual fornece o nome exibido.
      this.applyUserIdentity(perfilAtual.email || usuario.email, {
        ...usuario,
        ...perfilAtual,
        nome: perfilAtual.nome || perfilAtual.name
      });

      // Exibir nome e papel no dropdown
      const nameEl = document.getElementById('dropdown-name');
      if (nameEl) {
        const rawNome = perfilAtual.nome || perfilAtual.name || usuario.email.split('@')[0];
        nameEl.textContent = window.FormatadorTexto ? window.FormatadorTexto.formatarNomePessoa(rawNome) : rawNome;
      }

      // Armazenar dados para uso posterior
      sessionStorage.setItem('userName', perfilAtual.nome || perfilAtual.name || usuario.email.split('@')[0]);
      sessionStorage.setItem('userPapel', perfilAtual.papel || perfilAtual.role || usuario.papel);
      sessionStorage.setItem('userIdCurso', perfilAtual.idCurso || perfilAtual.course_id || usuario.idCurso || '');

      // Mostrar/esconder botão de gerenciar usuários
      this.updateManageUsersVisibility(perfilAtual.papel || perfilAtual.role || usuario.papel);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  }

  setupMenuButton() {
    const avatarBtn = document.querySelector('.user-avatar-btn');
    const dropdown = document.querySelector('.user-dropdown');

    if (!avatarBtn || !dropdown) {
      return;
    }

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    let fechamentoPendente = null;

    const cancelarFechamentoPendente = () => {
      if (fechamentoPendente) {
        dropdown.removeEventListener('animationend', fechamentoPendente);
        fechamentoPendente = null;
      }

      dropdown.classList.remove('caige-dropdown-closing');
    };

    const finalizarFechamento = () => {
      cancelarFechamentoPendente();
      dropdown.classList.remove('active');
    };

    const fecharDropdown = (imediato = false) => {
      if (!dropdown.classList.contains('active')) {
        avatarBtn.setAttribute('aria-expanded', 'false');
        cancelarFechamentoPendente();
        return;
      }

      avatarBtn.setAttribute('aria-expanded', 'false');

      if (imediato || prefersReducedMotion) {
        finalizarFechamento();
        return;
      }

      if (dropdown.classList.contains('caige-dropdown-closing')) {
        return;
      }

      fechamentoPendente = (event) => {
        if (event.animationName !== 'caige-dropdown-sair') {
          return;
        }

        finalizarFechamento();
      };

      dropdown.addEventListener('animationend', fechamentoPendente);
      dropdown.classList.add('caige-dropdown-closing');
    };

    const abrirDropdown = () => {
      cancelarFechamentoPendente();
      dropdown.classList.add('active');
      avatarBtn.setAttribute('aria-expanded', 'true');
    };

    avatarBtn.setAttribute('aria-haspopup', 'menu');
    avatarBtn.setAttribute(
      'aria-expanded',
      dropdown.classList.contains('active') ? 'true' : 'false'
    );

    avatarBtn.addEventListener('click', (event) => {
      event.stopPropagation();

      const estaAberto =
        dropdown.classList.contains('active') &&
        !dropdown.classList.contains('caige-dropdown-closing');

      if (estaAberto) {
        fecharDropdown();
      } else {
        abrirDropdown();
      }
    });

    document.addEventListener('click', (event) => {
      if (
        dropdown.classList.contains('active') &&
        !dropdown.contains(event.target) &&
        !avatarBtn.contains(event.target)
      ) {
        fecharDropdown();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        dropdown.classList.contains('active')
      ) {
        fecharDropdown();
        avatarBtn.focus();
      }
    });
  }

  setupManageUsersButton() {
    const btnManageUsers = document.querySelector('[data-action="manage-users"]');
    if (btnManageUsers) {
      btnManageUsers.addEventListener('click', (e) => {
        e.preventDefault();
        this.checkPermissionAndNavigate();
      });
    }
  }

  async checkPermissionAndNavigate() {
    try {
      const usuario = UtilJWT.obterUsuario();
      if (!usuario) {
        window.location.href = '../../paginas/autenticacao/entrar.html';
        return;
      }

      if (usuario.papel === 'SUPERVISOR') {
        window.location.href = '../../paginas/administracao/usuarios.html';
      } else {
        if (window.notify && typeof window.notify.warning === 'function') {
          window.notify.warning('Você não tem permissão para acessar esta funcionalidade');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
    }
  }

  garantirModalConta() {
    let modal = document.getElementById('modal-account');
    if (modal) {
      return modal;
    }

    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-account';
    modalDiv.innerHTML = `
      <div class="modal__content">
        <div class="modal__header modal__header--destaque">
          <h2 class="modal__title">Minha Conta</h2>
          <button class="modal__close" type="button" aria-label="Fechar"><span class="icone icone--sm" data-icone="fechar" aria-hidden="true"></span></button>
        </div>
        <div class="modal__body">
          <div class="account-tabs__navigation">
            <button type="button" class="account-tab-btn account-tab-btn--active" data-tab="profile">
              <span class="icone" data-icone="usuario" aria-hidden="true"></span>
              Perfil
            </button>
            <button type="button" class="account-tab-btn" data-tab="password">
              <span class="icone" data-icone="gerenciamento" aria-hidden="true"></span>
              Senha
            </button>
          </div>

          <div id="tab-profile" class="account__tab">
            <form class="modal__form" id="form-profile">
              <div class="modal__form-group">
                <label for="account-name">Nome Completo</label>
                <input type="text" id="account-name" placeholder="Seu nome completo" required />
              </div>
              <div class="modal__form-group">
                <label for="account-email">E-mail (não pode ser alterado)</label>
                <input type="email" id="account-email" disabled readonly />
              </div>
              <div class="modal__form-group">
                <label for="account-role">Nível de Acesso (Papel)</label>
                <input type="text" id="account-role" disabled readonly />
              </div>
              <div class="modal__form-group" id="account-course-group">
                <label for="account-course">Curso Vinculado</label>
                <input type="text" id="account-course" disabled readonly />
              </div>
              <div class="modal__form-actions">
                <button type="submit" class="modal__btn modal__btn--primary">Salvar Alterações</button>
                <button type="button" class="modal__btn modal__btn--cancel modal__close">Cancelar</button>
              </div>
            </form>
          </div>

          <div id="tab-password" class="account__tab account__tab--hidden">
            <form class="modal__form" id="form-password">
              <div class="modal__form-group">
                <label for="current-password">Senha Atual</label>
                <input type="password" id="current-password" placeholder="Digite sua senha atual" required autocomplete="current-password" />
              </div>
              <div class="modal__form-group">
                <label for="new-password">Nova Senha</label>
                <input type="password" id="new-password" placeholder="Digite a nova senha (mínimo 6 caracteres)" required minlength="6" autocomplete="new-password" />
              </div>
              <div class="modal__form-group">
                <label for="confirm-password">Confirmar Nova Senha</label>
                <input type="password" id="confirm-password" placeholder="Confirme a nova senha" required minlength="6" autocomplete="new-password" />
              </div>
              <div class="modal__form-actions">
                <button type="submit" class="modal__btn modal__btn--primary">Alterar Senha</button>
                <button type="button" class="modal__btn modal__btn--cancel modal__close">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);

    const formProfile = modalDiv.querySelector('#form-profile');
    if (formProfile) {
      formProfile.addEventListener('submit', (e) => {
        e.preventDefault();
        this.updateProfile();
      });
    }

    const formPassword = modalDiv.querySelector('#form-password');
    if (formPassword) {
      formPassword.addEventListener('submit', (e) => {
        e.preventDefault();
        this.changePassword();
      });
    }

    if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
      window.IconesCAIGE.aplicar(modalDiv);
    }

    return modalDiv;
  }

  setupModals() {
    this.garantirModalConta();

    // Eventos delegados para controle do modal de conta e logout
    document.addEventListener('click', (e) => {
      const btnMinhaConta = e.target.closest('[data-modal="account"], [data-action="my-account"]');
      if (btnMinhaConta) {
        e.preventDefault();
        this.openModal('account');
        this.loadAccountData();
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) dropdown.classList.remove('active');
        return;
      }

      const btnFechar = e.target.closest('.modal__close, .modal__btn--cancel');
      if (btnFechar) {
        const modal = btnFechar.closest('.modal');
        if (modal) {
          e.preventDefault();
          this.closeModal(modal.id);
        }
        return;
      }

      if (e.target.classList && e.target.classList.contains('modal')) {
        this.closeModal(e.target.id);
        return;
      }

      const btnSair = e.target.closest('[data-action="logout"]');
      if (btnSair) {
        e.preventDefault();
        this.logout();
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modalAtivo = document.querySelector('.modal.active');
        if (modalAtivo) {
          this.closeModal(modalAtivo.id);
        }
      }
    });

    document.addEventListener('submit', (e) => {
      if (e.target && e.target.id === 'form-profile') {
        e.preventDefault();
        this.updateProfile();
      } else if (e.target && e.target.id === 'form-password') {
        e.preventDefault();
        this.changePassword();
      }
    });
  }

  async loadAccountData() {
    try {
      this.garantirModalConta();
      const response = await fetch('/api/autenticacao/perfil');
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const profile = data.user || data;

      const nameInput = document.getElementById('account-name');
      const emailInput = document.getElementById('account-email');
      const roleInput = document.getElementById('account-role');
      const courseInput = document.getElementById('account-course');
      const courseGroup = document.getElementById('account-course-group');

      if (nameInput) nameInput.value = profile.name || profile.nome || '';
      if (emailInput) emailInput.value = profile.email || '';

      const papelRaw = String(profile.role || profile.papel || '').toUpperCase();
      const papelFormatado = papelRaw === 'SUPERVISOR' ? 'Supervisor' : (papelRaw === 'PROFESSOR' ? 'Professor' : papelRaw);
      if (roleInput) roleInput.value = papelFormatado || 'Usuário';

      if (courseInput && courseGroup) {
        if (papelRaw === 'SUPERVISOR') {
          courseInput.value = 'Acesso Global (Todos os Cursos)';
          courseGroup.style.display = 'block';
        } else if (papelRaw === 'PROFESSOR') {
          courseGroup.style.display = 'block';
          const idCurso = profile.idCurso || profile.course_id;
          if (idCurso) {
            courseInput.value = 'Carregando...';
            try {
              const resCursos = await fetch('/api/cursos');
              if (resCursos.ok) {
                const cursos = await resCursos.json();
                const cursoEncontrado = Array.isArray(cursos) ? cursos.find(c => c.id === idCurso) || cursos[0] : null;
                courseInput.value = cursoEncontrado ? cursoEncontrado.nome : `Curso #${idCurso}`;
              } else {
                courseInput.value = `Curso #${idCurso}`;
              }
            } catch {
              courseInput.value = `Curso #${idCurso}`;
            }
          } else {
            courseInput.value = 'Nenhum curso vinculado';
          }
        } else {
          courseGroup.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados da conta:', error);
    }
  }

  async updateProfile() {
    try {
      const nameInput = document.getElementById('account-name');
      const name = nameInput ? nameInput.value.trim() : '';

      if (!name) {
        if (window.notify && typeof window.notify.warning === 'function') {
          window.notify.warning('Nome não pode estar vazio');
        }
        return;
      }

      const response = await fetch('/api/autenticacao/perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        if (window.notify && typeof window.notify.success === 'function') {
          window.notify.success('Perfil atualizado com sucesso!');
        }
        sessionStorage.setItem('userName', name);
        this.closeModal('modal-account');
        await this.loadUserProfile();
      } else {
        const error = await response.json().catch(() => ({}));
        if (window.notify && typeof window.notify.error === 'function') {
          window.notify.error(error.message || 'Erro ao atualizar perfil');
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      if (window.notify && typeof window.notify.error === 'function') {
        window.notify.error('Erro ao atualizar perfil');
      }
    }
  }

  async changePassword() {
    try {
      const currentPassword = document.getElementById('current-password')?.value || '';
      const newPassword = document.getElementById('new-password')?.value || '';
      const confirmPassword = document.getElementById('confirm-password')?.value || '';

      if (!currentPassword || !newPassword || !confirmPassword) {
        if (window.notify && typeof window.notify.warning === 'function') {
          window.notify.warning('Preencha todos os campos');
        }
        return;
      }

      if (newPassword !== confirmPassword) {
        if (window.notify && typeof window.notify.warning === 'function') {
          window.notify.warning('As senhas não conferem');
        }
        return;
      }

      if (newPassword.length < 6) {
        if (window.notify && typeof window.notify.warning === 'function') {
          window.notify.warning('A senha deve ter no mínimo 6 caracteres');
        }
        return;
      }

      const response = await fetch('/api/autenticacao/alterar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        if (window.notify && typeof window.notify.success === 'function') {
          window.notify.success('Senha alterada com sucesso!');
        }
        const formPassword = document.getElementById('form-password');
        if (formPassword) formPassword.reset();
        this.closeModal('modal-account');
      } else {
        const error = await response.json().catch(() => ({}));
        if (window.notify && typeof window.notify.error === 'function') {
          window.notify.error(error.message || 'Erro ao alterar senha');
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      if (window.notify && typeof window.notify.error === 'function') {
        window.notify.error('Erro ao alterar senha');
      }
    }
  }

  openModal(modalName) {
    const id = modalName.startsWith('modal-') ? modalName : `modal-${modalName}`;
    let modal = document.getElementById(id);
    if (!modal && id === 'modal-account') {
      modal = this.garantirModalConta();
    }
    if (modal) {
      modal.classList.add('active');
    }
  }

  closeModal(modalId) {
    const id = modalId.startsWith('modal-') ? modalId : `modal-${modalId}`;
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  async logout() {
    if (window.ModalConfirmacao && typeof window.ModalConfirmacao.confirmar === 'function') {
      const confirmado = await window.ModalConfirmacao.confirmar({
        titulo: 'Sair do Sistema',
        mensagem: 'Deseja encerrar sua sessão no CAIGE?',
        variante: 'aviso',
        textoConfirmar: 'Sair',
        textoCancelar: 'Cancelar',
        icone: 'sair'
      });
      if (!confirmado) return;
    }

    sessionStorage.removeItem('userEmail');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('jwtToken');
    sessionStorage.clear();
    window.location.href = '../../paginas/autenticacao/entrar.html';
  }
}

// Instanciar ao carregar
document.addEventListener('DOMContentLoaded', () => {
  new UserMenuSystem();
});



