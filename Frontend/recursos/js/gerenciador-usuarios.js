// Gerenciador de Usuários - PT-BR Schema
class GerenciadorUsuarios {
  constructor() {
    this.editandoIdUsuario = null;
    this.cursos = [];
    this.usuarios = [];
    this.API_BASE = '/api';
    this.paginacao = null;
    this.init();
  }

  async init() {
    await this.carregarCursos();
    this.setupFormularios();
    this.setupAcoesLista();
    await this.carregarUsuarios();
  }

  // Carregar lista de cursos disponíveis
  async carregarCursos() {
    try {
      const response = await fetch(`${this.API_BASE}/cursos`);
      if (response.ok) {
        const data = await response.json();
        this.cursos = data.cursos || data;
        this.atualizarSelectCursos();
      }
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  }

  // Atualizar selects de cursos
  atualizarSelectCursos() {
    const selectores = ['#curso-novo', '#curso-edicao'];
    selectores.forEach(selector => {
      const select = document.querySelector(selector);
      if (select) {
        // Limpar opções existentes
        select.innerHTML = '<option value="">Selecione um curso</option>';
        this.cursos.forEach(curso => {
          const option = document.createElement('option');
          option.value = curso.id;
          option.textContent = curso.nome;
          select.appendChild(option);
        });
      }
    });
  }

  // Atualizar exibição do campo de curso baseado no papel
  setupFormularios() {
    // Novo usuário
    const papelSelect = document.querySelector('#papel-novo');
    const cursoGroup = document.querySelector('[data-group="curso-novo"]');
    
    if (papelSelect && cursoGroup) {
      papelSelect.addEventListener('change', (e) => {
        const ehProfessor = e.target.value === 'PROFESSOR';
        cursoGroup.style.display = ehProfessor ? 'block' : 'none';
        if (!ehProfessor) {
          document.querySelector('#curso-novo').value = '';
        }
      });
    }

    const papelEdicao = document.querySelector('#papel-edicao');
    const cursoEdicaoGroup = document.querySelector('[data-group="curso-edicao"]');
    if (papelEdicao && cursoEdicaoGroup) {
      papelEdicao.addEventListener('change', (e) => {
        const ehProfessor = e.target.value === 'PROFESSOR';
        cursoEdicaoGroup.style.display = ehProfessor ? 'block' : 'none';
        if (!ehProfessor) {
          document.querySelector('#curso-edicao').value = '';
        }
      });
    }

    // Formulário de criação
    const formCriar = document.getElementById('form-criar-usuario');
    if (formCriar) {
      formCriar.addEventListener('submit', (e) => this.aoSubmeterNovo(e));
    }

    // Formulário de edição
    const formEditar = document.getElementById('form-editar-usuario');
    if (formEditar) {
      formEditar.addEventListener('submit', (e) => this.aoSubmeterEdicao(e));
    }
  }


  setupAcoesLista() {
    if (document.documentElement.dataset.userActionsReady === 'true') return;
    document.documentElement.dataset.userActionsReady = 'true';

    // No mobile o menu de ações é movido para <body> (portal).
    // Por isso a delegação precisa ficar no document, não só na lista.
    document.addEventListener('click', (event) => {
      const botao = event.target.closest('[data-user-action]');
      if (!botao || botao.disabled) return;

      const usuarioId = Number(botao.dataset.userId);
      if (!Number.isFinite(usuarioId)) return;

      if (botao.dataset.userAction === 'editar') {
        this.abrirEdicao(usuarioId);
      } else if (botao.dataset.userAction === 'desativar') {
        this.desativarUsuario(usuarioId);
      } else if (botao.dataset.userAction === 'ativar') {
        this.ativarUsuario(usuarioId);
      } else if (botao.dataset.userAction === 'arquivar') {
        this.arquivarUsuario(usuarioId);
      }
    });
  }

  configurarPaginacao() {
    if (this.paginacao || typeof PaginacaoLista === 'undefined') {
      return;
    }

    this.paginacao = new PaginacaoLista({
      seletorQuantidade: '#usuarios-page-size',
      seletorPaginacao: '#usuarios-pagination',
      seletorIndicador: '#usuarios-page-indicator',
      seletorPrimeira: '#usuarios-first-page',
      seletorAnterior: '#usuarios-prev-page',
      seletorProxima: '#usuarios-next-page',
      seletorUltima: '#usuarios-last-page',
      tamanhoPadrao: 10,
      aoRenderizar: (usuariosDaPagina) => {
        this.renderizarUsuariosDaPagina(usuariosDaPagina);
      }
    });
  }


  async aoSubmeterNovo(e) {
    e.preventDefault();
    
    const email = document.querySelector('#email-novo').value.trim();
    const nome = document.querySelector('#nome-novo').value.trim();
    const senha = document.querySelector('#senha-nova').value;
    const papel = document.querySelector('#papel-novo').value;
    const idCurso = papel === 'PROFESSOR' ? document.querySelector('#curso-novo').value : null;
    const ativo = document.querySelector('#ativo-novo')?.checked ?? true;

    // Validações
    if (!email || !nome || !senha || !papel) {
      notify.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!/^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u.test(nome)) {
      notify.warning('O nome deve conter somente letras.');
      document.querySelector('#nome-novo')?.focus();
      return;
    }

    if (senha.length < 6) {
      notify.warning('A senha deve ter no mínimo 6 caracteres.');
      document.querySelector('#senha-nova')?.focus();
      return;
    }

    if (papel === 'PROFESSOR' && !idCurso) {
      notify.error('Selecione um curso para professores');
      return;
    }

    const nomeNormalizado = window.FormatadorTexto ? window.FormatadorTexto.formatarNomePessoa(nome) : nome;

    try {
      const response = await fetch(`${this.API_BASE}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          nome: nomeNormalizado,
          password: senha,
          papel,
          idCurso: idCurso ? parseInt(idCurso) : null,
          ativo
        })
      });

      const data = await response.json();
      if (response.ok) {
        notify.success('Usuário criado com sucesso!');
        document.getElementById('form-criar-usuario').reset();
        await this.carregarUsuarios();
      } else {
        notify.error(data.message || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro:', error);
      notify.error('Erro ao conectar com o servidor');
    }
  }

  async aoSubmeterEdicao(e) {
    e.preventDefault();

    if (!this.editandoIdUsuario) {
      notify.error('Nenhum usuário selecionado');
      return;
    }

    const email = document.querySelector('#email-edicao').value.trim();
    const nome = document.querySelector('#nome-edicao').value.trim();
    const papel = document.querySelector('#papel-edicao').value;
    const idCurso = papel === 'PROFESSOR' ? document.querySelector('#curso-edicao').value : null;
    const ativo = document.querySelector('#ativo-edicao')?.checked ?? true;
    const novaSenha = document.querySelector('#senha-edicao')?.value || '';
    const confirmacaoNovaSenha = document.querySelector('#senha-edicao-confirmacao')?.value || '';

    if (!email || !nome || !papel) {
      notify.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!/^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u.test(nome)) {
      notify.warning('O nome deve conter somente letras.');
      document.querySelector('#nome-edicao')?.focus();
      return;
    }

    if (papel === 'PROFESSOR' && !idCurso) {
      notify.error('Selecione um curso para professores');
      return;
    }

    if (novaSenha || confirmacaoNovaSenha) {
      if (novaSenha.length < 6) {
        notify.warning('A nova senha deve ter no mínimo 6 caracteres');
        return;
      }

      if (novaSenha !== confirmacaoNovaSenha) {
        notify.warning('A confirmação da nova senha não confere');
        return;
      }
    }

    const usuarioAtual = this.usuarios.find((usuario) => usuario.id === this.editandoIdUsuario);
    const nomeAtual = usuarioAtual?.nome || '';
    const alterouNome = nome !== nomeAtual;
    const alterouSenha = Boolean(novaSenha);
    let senhaSupervisor = null;

    if (alterouNome || alterouSenha) {
      senhaSupervisor = await this.solicitarSenhaSupervisor();
      if (!senhaSupervisor) return;
    }

    const nomeNormalizado = window.FormatadorTexto
      ? window.FormatadorTexto.formatarNomePessoa(nome)
      : nome;

    try {
      const response = await fetch(`${this.API_BASE}/usuarios/${this.editandoIdUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          nome: nomeNormalizado,
          papel,
          idCurso: idCurso ? parseInt(idCurso) : null,
          ativo,
          ...(alterouSenha ? { novaSenha } : {}),
          ...((alterouNome || alterouSenha) ? { senhaSupervisor } : {})
        })
      });

      const data = await response.json();
      if (response.ok) {
        notify.success(alterouSenha ? 'Usuário e senha atualizados com sucesso!' : 'Usuário atualizado com sucesso!');
        document.getElementById('modal-editar-usuario').style.display = 'none';
        this.editandoIdUsuario = null;
        await this.carregarUsuarios();
      } else {
        notify.error(data.message || 'Erro ao atualizar usuário');
      }
    } catch (error) {
      console.error('Erro:', error);
      notify.error('Erro ao conectar com o servidor');
    }
  }

  solicitarSenhaSupervisor() {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-confirmar-senha');
      const input = document.getElementById('senha-supervisor-confirmacao');
      const confirmar = document.getElementById('confirmar-senha-supervisor');
      if (!modal || !input || !confirmar) {
        resolve(null);
        return;
      }
      const finalizar = (senha) => {
        confirmar.removeEventListener('click', aoConfirmar);
        modal.querySelectorAll('.modal__close').forEach((botao) => botao.removeEventListener('click', aoCancelar));
        modal.style.display = 'none';
        input.value = '';
        resolve(senha);
      };
      const aoConfirmar = () => finalizar(input.value.trim() || null);
      const aoCancelar = () => finalizar(null);
      confirmar.addEventListener('click', aoConfirmar);
      modal.querySelectorAll('.modal__close').forEach((botao) => botao.addEventListener('click', aoCancelar));
      modal.style.display = 'flex';
      input.focus();
    });
  }

  async carregarUsuarios() {
    try {
      const response = await fetch(`${this.API_BASE}/usuarios`);

      if (response.ok) {
        const data = await response.json();

        this.usuarios = data.usuarios || data;

        this.configurarPaginacao();

        if (this.paginacao) {
          this.paginacao.definirItens(this.usuarios);
        } else {
          this.renderizarUsuariosDaPagina(this.usuarios);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      notify.error('Erro ao carregar usuários');
    }
  }

  renderizarUsuariosDaPagina(usuariosDaPagina) {
    const grid = document.getElementById('lista-usuarios');
    const listContainer = grid?.querySelector('[data-grid-body]');
    if (!grid || !listContainer) return;

    if (!Array.isArray(usuariosDaPagina) || usuariosDaPagina.length === 0) {
      listContainer.innerHTML = `<div class="admin-empty-state">Nenhum usuário cadastrado</div>`;
      return;
    }

    const nomesCursos = {};
    this.cursos.forEach((curso) => { nomesCursos[curso.id] = curso.nome; });

    listContainer.innerHTML = usuariosDaPagina.map((usuario) => {
      const curso = usuario.idCurso ? (nomesCursos[usuario.idCurso] || '-') : '-';
      const classePapel = usuario.papel === 'SUPERVISOR' ? 'supervisor' : 'professor';
      const status = usuario.ativo ? 'Ativo' : 'Inativo';
      const protegidoSistema = usuario.protegidoSistema === true || usuario.protegidoSistema === 1 || String(usuario.email || '').trim().toLowerCase() === 'suportecaige@univale.br';
      const nome = (window.FormatadorTexto && usuario.nome) ? window.FormatadorTexto.formatarNomePessoa(usuario.nome) : (usuario.nome || usuario.email);
      const iniciais = String(nome || usuario.email || 'U')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte.charAt(0))
        .join('')
        .toUpperCase() || 'U';

      return `
        <div class="user-item data-grid__row admin-record record-accent">
          <div class="user-avatar-mobile" aria-hidden="true">${iniciais}</div>
          <div class="user-info data-grid__cell" data-label="Usuário">
            <div class="user-identity-cell">
              <div class="user-name">${nome}</div>
              <div class="user-email-text">${usuario.email}</div>
            </div>
          </div>
          <div class="user-meta-mobile">
            <span class="role-badge ${classePapel}">${usuario.papel}</span>
            ${protegidoSistema ? '<span class="role-badge supervisor" title="Conta administrativa protegida">Conta do sistema</span>' : ''}
            ${curso !== '-' ? `<span class="user-meta-mobile__separator" aria-hidden="true">•</span><span class="user-meta-mobile__course">${curso}</span>` : ''}
          </div>
          <div class="user-role-cell data-grid__cell data-grid__cell--center${protegidoSistema ? ' is-system-account' : ''}" data-label="Perfil">
            <span class="role-badge ${classePapel}">${usuario.papel}</span>
            ${protegidoSistema ? '<span class="role-badge supervisor" title="Conta administrativa protegida">Conta do sistema</span>' : ''}
          </div>
          <div class="user-course-cell data-grid__cell" data-label="Curso">${curso}</div>
          <div class="user-status-cell data-grid__cell data-grid__cell--center" data-label="Status">
            <span class="user-status-text ${usuario.ativo ? 'is-active' : 'is-inactive'}">${status}</span>
          </div>
          <div class="user-actions data-grid__cell data-grid__cell--center" data-label="Ações">
            <button type="button" class="menu-acoes-trigger" data-user-menu="${usuario.id}" aria-label="Ações de ${usuario.nome || usuario.email}" aria-expanded="false"><span class="icone icone--sm" data-icone="menu" aria-hidden="true"></span></button>
          </div>
        </div>`;
    }).join('');

    window.IconesCAIGE?.aplicar?.(listContainer);
    listContainer.querySelectorAll('[data-user-menu]').forEach((botao) => {
      botao.addEventListener('click', () => {
        const usuarioId = Number(botao.dataset.userMenu);
        const usuario = this.usuarios.find((item) => Number(item.id) === usuarioId);
        if (!usuario || !window.MenuAcoes) return;
        const protegidoSistema = usuario.protegidoSistema === true || usuario.protegidoSistema === 1 || String(usuario.email || '').trim().toLowerCase() === 'suportecaige@univale.br';
        const itens = [{ rotulo: 'Editar', acao: () => this.abrirEdicao(usuarioId) }];
        if (!protegidoSistema && usuario.ativo) itens.push({ rotulo: 'Desativar', perigo: true, acao: () => this.desativarUsuario(usuarioId) });
        else if (!protegidoSistema) {
          itens.push({ rotulo: 'Ativar', acao: () => this.ativarUsuario(usuarioId) });
          itens.push({ rotulo: 'Arquivar', perigo: true, acao: () => this.arquivarUsuario(usuarioId) });
        }
        MenuAcoes.abrir(botao, itens);
      });
    });
  }

  abrirEdicao(usuarioId) {
    const usuario = this.usuarios.find(u => u.id === usuarioId);
    if (!usuario) {
      notify.error('Usuário não encontrado');
      return;
    }

    this.editandoIdUsuario = usuarioId;

    const protegidoSistema =
      usuario.protegidoSistema === true ||
      usuario.protegidoSistema === 1 ||
      String(usuario.email || '').trim().toLowerCase() === 'suportecaige@univale.br';
    
    document.querySelector('#email-edicao').value = usuario.email;
    document.querySelector('#nome-edicao').value = (window.FormatadorTexto && usuario.nome) ? window.FormatadorTexto.formatarNomePessoa(usuario.nome) : (usuario.nome || '');
    document.querySelector('#papel-edicao').value = usuario.papel;
    document.querySelector('#curso-edicao').value = usuario.idCurso || '';
    document.querySelector('#ativo-edicao').checked = usuario.ativo !== 0 && usuario.ativo !== false;

    const emailEdicao = document.querySelector('#email-edicao');
    const papelEdicao = document.querySelector('#papel-edicao');
    const cursoEdicao = document.querySelector('#curso-edicao');
    const ativoEdicao = document.querySelector('#ativo-edicao');

    if (emailEdicao) emailEdicao.disabled = protegidoSistema;
    if (papelEdicao) papelEdicao.disabled = protegidoSistema;
    if (cursoEdicao) cursoEdicao.disabled = protegidoSistema;
    if (ativoEdicao) ativoEdicao.disabled = protegidoSistema;

    const senhaEdicao = document.querySelector('#senha-edicao');
    const senhaEdicaoConfirmacao = document.querySelector('#senha-edicao-confirmacao');
    if (senhaEdicao) senhaEdicao.value = '';
    if (senhaEdicaoConfirmacao) senhaEdicaoConfirmacao.value = '';

    // Atualizar visibilidade do campo curso
    const cursoGroupEdicao = document.querySelector('[data-group="curso-edicao"]');
    if (cursoGroupEdicao) {
      cursoGroupEdicao.style.display = usuario.papel === 'PROFESSOR' ? 'block' : 'none';
    }

    document.getElementById('modal-editar-usuario').style.display = 'flex';
  }

  async ativarUsuario(usuarioId) {
    try {
      const response = await fetch(`${this.API_BASE}/usuarios/${usuarioId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return notify.error(data.message || 'Erro ao ativar usuário');
      notify.success('Usuário ativado com sucesso!');
      await this.carregarUsuarios();
    } catch (error) {
      console.error('Erro ao ativar usuário:', error);
      notify.error('Erro ao conectar com o servidor');
    }
  }

  async arquivarUsuario(usuarioId) {
    const usuario = this.usuarios.find((item) => item.id === usuarioId);
    const protegidoSistema =
      usuario?.protegidoSistema === true ||
      usuario?.protegidoSistema === 1 ||
      String(usuario?.email || '').trim().toLowerCase() === 'suportecaige@univale.br';

    if (protegidoSistema) {
      notify.warning('O usuário Suporte CAIGE é uma conta protegida e não pode ser arquivado.');
      return;
    }
    if (usuario?.ativo !== false && usuario?.ativo !== 0) {
      notify.warning('Desative o usuário antes de arquivá-lo.');
      return;
    }

    const confirmado = await window.ModalConfirmacao?.confirmar?.({
      titulo: 'Arquivar Usuário',
      mensagem: 'O usuário sairá da lista atual e poderá ser recuperado em Usuários Arquivados.',
      variante: 'perigo',
      textoConfirmar: 'Arquivar',
      textoCancelar: 'Cancelar',
      icone: 'excluir'
    });
    if (!confirmado) return;

    try {
      const response = await fetch(`${this.API_BASE}/usuarios/${usuarioId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        notify.error(data.message || 'Erro ao arquivar usuário');
        return;
      }
      notify.success('Usuário arquivado com sucesso!');
      await this.carregarUsuarios();
      window.loadArchivedData?.();
    } catch (error) {
      console.error('Erro ao arquivar usuário:', error);
      notify.error('Erro ao conectar com o servidor');
    }
  }

  async desativarUsuario(usuarioId) {
    const usuario = this.usuarios.find((item) => item.id === usuarioId);
    const protegidoSistema =
      usuario?.protegidoSistema === true ||
      usuario?.protegidoSistema === 1 ||
      String(usuario?.email || '').trim().toLowerCase() === 'suportecaige@univale.br';

    if (protegidoSistema) {
      notify.warning('O usuário Suporte CAIGE é uma conta protegida do sistema e não pode ser desativado.');
      return;
    }

    let confirmado = false;
    if (window.ModalConfirmacao && typeof window.ModalConfirmacao.confirmar === 'function') {
      confirmado = await window.ModalConfirmacao.confirmar({
        titulo: 'Desativar Usuário',
        mensagem: 'Tem certeza que deseja desativar este usuário?',
        variante: 'aviso',
        textoConfirmar: 'Desativar',
        textoCancelar: 'Cancelar',
        icone: 'alerta'
      });
    }
    if (!confirmado) return;

    try {
      const response = await fetch(`${this.API_BASE}/usuarios/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: false })
      });

      if (response.ok) {
        notify.success('Usuário desativado com sucesso!');
        await this.carregarUsuarios();
      } else {
        const data = await response.json().catch(() => ({}));
        notify.error(data.message || 'Erro ao desativar usuário');
      }
    } catch (error) {
      console.error('Erro:', error);
      notify.error('Erro ao conectar com o servidor');
    }
  }
}

// Instanciar ao carregar
let gerenciadorUsuarios;
document.addEventListener('DOMContentLoaded', () => {
  gerenciadorUsuarios = new GerenciadorUsuarios();
  window.gerenciadorUsuarios = gerenciadorUsuarios;
});
