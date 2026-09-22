// =========================================================
// CAIGE - CONTROLE DA TELA MEU CURSO (PROFESSOR)
// =========================================================
// Gerencia a exibição do curso vinculado e suas atividades.
// Se o professor não tiver curso vinculado, exibe estado vazio humanizado.
// Se for supervisor, orienta acesso pelo Painel de Gerenciamento.
// =========================================================

(function () {
  let cursoAtual = null;

  function escapeHtml(texto) {
    if (texto === null || texto === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(texto);
    return div.innerHTML;
  }

  async function inicializar() {
    const container = document.getElementById('meu-curso-container');
    if (!container) return;

    // Verificar sessão
    if (window.UtilJWT && typeof window.UtilJWT.exigirSessao === 'function') {
      if (!window.UtilJWT.exigirSessao()) return;
    }

    try {
      const perfilRes = await fetch('/api/autenticacao/perfil');
      if (!perfilRes.ok) {
        throw new Error('Não foi possível carregar seu perfil');
      }

      const perfil = await perfilRes.json();
      const papel = String(perfil.role || perfil.papel || '').toUpperCase();

      if (papel === 'SUPERVISOR') {
        renderizarSupervisor(container);
        return;
      }

      // Professor: buscar cursos vinculados
      const cursosRes = await fetch('/api/cursos');
      if (!cursosRes.ok) {
        throw new Error('Não foi possível carregar informações do curso');
      }

      const cursos = await cursosRes.json();

      if (!Array.isArray(cursos) || cursos.length === 0) {
        renderizarVazio(container);
        return;
      }

      cursoAtual = cursos[0];
      renderizarCurso(container, cursoAtual);
    } catch (erro) {
      console.error('Erro ao inicializar Meu Curso:', erro);
      container.innerHTML = `
        <div class="meu-curso-empty-state">
          <div class="meu-curso-empty-icon icone" data-icone="alerta" aria-hidden="true"></div>
          <h3 class="meu-curso-empty-title">Erro ao carregar curso</h3>
          <p class="meu-curso-empty-text">${escapeHtml(erro.message) || 'Ocorreu um erro ao buscar os dados. Tente novamente mais tarde.'}</p>
        </div>
      `;
      if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
        window.IconesCAIGE.aplicar(container);
      }
    }
  }

  function renderizarVazio(container) {
    container.innerHTML = `
      <div class="meu-curso-empty-state">
        <div class="meu-curso-empty-icon icone" data-icone="caixa-vazia" aria-hidden="true"></div>
        <h3 class="meu-curso-empty-title">Você ainda não está vinculado a um curso.</h3>
        <p class="meu-curso-empty-text">Procure um Supervisor para realizar a vinculação do seu perfil ao curso responsável.</p>
      </div>
    `;

    if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
      window.IconesCAIGE.aplicar(container);
    }
  }

  function renderizarSupervisor(container) {
    container.innerHTML = `
      <div class="meu-curso-aviso-supervisor">
        <div>
          <p><strong>Acesso de Supervisor</strong></p>
          <p>Você possui acesso global ao sistema. Para visualizar e administrar todos os cursos e atividades, utilize o Painel de Gerenciamento.</p>
        </div>
        <a href="../administracao/usuarios.html" class="btn btn--primary">
          <span class="icone" data-icone="gerenciamento" aria-hidden="true"></span>
          Ir para Painel de Gerenciamento
        </a>
      </div>
    `;

    if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
      window.IconesCAIGE.aplicar(container);
    }
  }

  function renderizarCurso(container, curso) {
    container.innerHTML = `
      <div class="meu-curso-painel meu-curso-card">
        <header class="meu-curso-header">
          <div class="meu-curso-header__info">
            <div class="meu-curso-header__icone icone" data-icone="cursos" aria-hidden="true"></div>
            <div class="meu-curso-header__detalhes">
              <h2 class="meu-curso-header__titulo meu-curso-card__title">${escapeHtml(curso.nome)}</h2>
              <div class="meu-curso-header__status">
                <span class="status-pill ${curso.ativo ? 'status-pill--success' : 'status-pill--danger'}">
                  ${curso.ativo ? 'Curso Ativo' : 'Curso Inativo'}
                </span>
              </div>
            </div>
          </div>
          <div class="meu-curso-header__acoes">
            <button type="button" class="btn btn--primary" id="btn-nova-atividade">
              <span class="icone" data-icone="mais" aria-hidden="true"></span>
              Nova Atividade
            </button>
          </div>
        </header>

        <hr class="meu-curso-divisor" />

        <section class="meu-curso-secao" aria-labelledby="meu-curso-secao-titulo">
          <div class="meu-curso-secao__cabecalho">
            <h3 class="meu-curso-secao__titulo" id="meu-curso-secao-titulo">Atividades do Curso</h3>
            <p class="meu-curso-secao__descricao">Atividades disponíveis para registros em atendimentos e prontuários.</p>
          </div>
          <div id="meu-curso-atividades-lista" class="meu-curso-atividades-lista data-grid data-grid--activities">
            <div class="data-grid__header">
              <div class="data-grid__cell">Atividade</div>
              <div class="data-grid__cell data-grid__cell--center">Status</div>
              <div class="data-grid__cell data-grid__cell--center">Ações</div>
            </div>
            <div class="data-grid__body" data-grid-body></div>
          </div>
        </section>
      </div>
    `;

    if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
      window.IconesCAIGE.aplicar(container);
    }

    const btnNova = document.getElementById('btn-nova-atividade');
    if (btnNova) {
      btnNova.addEventListener('click', () => {
        if (window.GerenciadorAtividades) {
          window.GerenciadorAtividades.abrirModal(curso.id, curso.nome, () => {
            recarregarAtividades(curso.id);
          });
        }
      });
    }

    recarregarAtividades(curso.id);
  }

  async function recarregarAtividades(idCurso) {
    const lista = document.getElementById('meu-curso-atividades-lista');
    if (!lista || !window.GerenciadorAtividades) return;

    await window.GerenciadorAtividades.carregarLista(idCurso, lista, {
      aoEditar(atividade) {
        window.GerenciadorAtividades.abrirModal(
          idCurso,
          cursoAtual?.nome || '',
          () => recarregarAtividades(idCurso),
          atividade
        );
      }
    });
  }

  document.addEventListener('DOMContentLoaded', inicializar);
})();
