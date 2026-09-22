// Sistema de Controle de Acesso (RBAC) - PT-BR Schema
class ControleAcesso {
  constructor() {
    this.papel = null;  // SUPERVISOR ou PROFESSOR
    this.idUsuario = null;
    this.idCurso = null;
    this.email = null;
    this.nome = null;
    this.carregarDados();
  }

  // Carregar dados do JWT
  carregarDados() {
    try {
      const usuario = UtilJWT.obterUsuario();
      if (usuario) {
        this.papel = usuario.papel;
        this.idUsuario = usuario.idUsuario;
        this.idCurso = usuario.idCurso;
        this.email = usuario.email;
        this.nome = usuario.nome;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }

  // Verificar se é SUPERVISOR
  ehSupervisor() {
    return this.papel === 'SUPERVISOR';
  }

  // Verificar se é PROFESSOR
  ehProfessor() {
    return this.papel === 'PROFESSOR';
  }

  // Verificar se tem papel requerido
  temPapel(papelRequerido) {
    if (typeof papelRequerido === 'string') {
      return this.papel === papelRequerido;
    }
    if (Array.isArray(papelRequerido)) {
      return papelRequerido.includes(this.papel);
    }
    return false;
  }

  // Obter dados do usuário
  obterDados() {
    return {
      papel: this.papel,
      idUsuario: this.idUsuario,
      idCurso: this.idCurso,
      email: this.email,
      nome: this.nome
    };
  }

  // Aplicar controle de acesso aos elementos HTML
  aplicarControleAcesso() {
    // Mostrar/esconder elementos por papel (data-require-role)
    document.querySelectorAll('[data-require-role]').forEach(element => {
      const requiredRole = element.getAttribute('data-require-role');
      const allowedRoles = requiredRole.split(',').map(r => r.trim());

      if (!allowedRoles.includes(this.papel)) {
        element.style.display = 'none';
      }
    });

    // Aplicar classe CSS por papel (para estilos específicos)
    if (this.papel) {
      document.body.classList.add(`papel-${this.papel.toLowerCase()}`);
    }
  }

  // Mostrar elemento (com fallback)
  showElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = '';
    }
  }

  // Esconder elemento
  hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = 'none';
    }
  }

  // Logout
  fazerLogout() {
    UtilJWT.limpar();
    window.location.href = '../../paginas/autenticacao/entrar.html';
  }
}

// Instância global
const controleAcesso = new ControleAcesso();

// Compatibilidade global
window.ControleAcesso = ControleAcesso;
window.controleAcesso = controleAcesso;

// Aplicar controle de acesso quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  controleAcesso.aplicarControleAcesso();
});



