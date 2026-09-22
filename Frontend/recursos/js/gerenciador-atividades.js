// =========================================================
// CAIGE - GERENCIADOR DE ATIVIDADES DE ATENDIMENTO
// =========================================================
// Módulo compartilhado para listagem, cadastro e edição
// de atividades de atendimento vinculadas a um curso.
// Utilizado por:
// - usuarios.html (Supervisor no Painel de Gerenciamento)
// - meu-curso.html (Professor na tela Meu Curso)
// =========================================================

const GerenciadorAtividades = (() => {
  let callbackAposSalvar = null;
  let eventosVinculados = false;

  function escapeHtml(texto) {
    return String(texto || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function listar(idCurso) {
    const url = idCurso
      ? `/api/atividades-atendimento/curso/${idCurso}`
      : '/api/atividades-atendimento';

    const resposta = await fetch(url);
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.message || 'Erro ao listar atividades');
    }
    return resposta.json();
  }

  async function salvar({ id, idCurso, nome, ativo }) {
    const url = id
      ? `/api/atividades-atendimento/${id}`
      : '/api/atividades-atendimento';
    const metodo = id ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idCurso, nome, descricao: null, ativo })
    });

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      throw new Error(dados.message || 'Erro ao salvar atividade');
    }
    return dados;
  }

  async function excluir(id) {
    const resposta = await fetch(`/api/atividades-atendimento/${id}`, { method: 'DELETE' });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.message || 'Erro ao excluir atividade');
    return dados;
  }

  function garantirModalAtividades() {
    let modal = document.getElementById('modal-activities');
    if (modal) {
      vincularEventosModal(modal);
      return modal;
    }

    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-activities';
    modalDiv.innerHTML = `
      <div class="modal__content modal__content--large">
        <div class="modal__header modal__header--destaque">
          <h2 class="modal__title">Atividades - <span id="activities-course-name"></span></h2>
          <button class="modal__close" type="button" aria-label="Fechar"><span class="icone icone--sm" data-icone="fechar" aria-hidden="true"></span></button>
        </div>
        <div class="modal__body">
          <input type="hidden" id="activities-course-id" />

          <section class="modal-section activity-form-section">
            <div class="activity-form-heading">
              <span class="activity-form-heading__eyebrow">Cadastro</span>
              <h3 class="modal-section__title" id="activity-form-title">Cadastrar nova atividade</h3>
              <p class="activity-form-heading__description">Adicione uma atividade de atendimento para este curso.</p>
            </div>

            <form class="modal__form" id="activity-form">
              <input type="hidden" id="activity-id" />

              <div class="modal__form-group">
                <label for="activity-name">Nome</label>
                <input id="activity-name" required />
              </div>


              <div class="modal__form-group">
                <label class="checkbox-field">
                  <input type="checkbox" id="activity-active" checked />
                  <span>Ativa</span>
                </label>
              </div>

              <div class="modal__form-actions">
                <button class="modal__btn modal__btn--primary" type="submit">Salvar</button>
                <button class="modal__btn modal__btn--secondary modal__close" type="button">Cancelar</button>
              </div>
            </form>
          </section>

          <section class="modal-section activity-list-section">
            <div class="activity-list-heading">
              <span class="activity-form-heading__eyebrow">Atividades cadastradas</span>
            </div>
            <div id="activities-list" class="modal-list data-grid data-grid--activities admin-data-grid admin-data-grid--activities">
              <div class="data-grid__header">
                <div class="data-grid__cell">Atividade</div>
                <div class="data-grid__cell data-grid__cell--center">Status</div>
                <div class="data-grid__cell data-grid__cell--center">Ações</div>
              </div>
              <div class="data-grid__body" data-grid-body></div>
            </div>
          </section>
        </div>
      </div>
    `;

    document.body.appendChild(modalDiv);
    window.IconesCAIGE?.aplicar?.(modalDiv);
    vincularEventosModal(modalDiv);
    return modalDiv;
  }

  function vincularEventosModal(modal) {
    if (eventosVinculados || !modal) return;
    eventosVinculados = true;

    modal.querySelectorAll('.modal__close').forEach((btn) => {
      btn.addEventListener('click', () => {
        fecharModal();
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        fecharModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modalAtividades = document.getElementById('modal-activities');
        if (modalAtividades && (modalAtividades.classList.contains('active') || modalAtividades.style.display === 'flex')) {
          fecharModal();
        }
      }
    });

    const form = document.getElementById('activity-form');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = document.getElementById('activity-id')?.value || null;
        const idCurso = document.getElementById('activities-course-id')?.value;
        const nome = document.getElementById('activity-name')?.value?.trim();
        if (!/^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u.test(nome || '')) {
          notify.warning('O nome da atividade deve conter somente letras.');
          document.getElementById('activity-name')?.focus();
          return;
        }
        const ativo = document.getElementById('activity-active')?.checked !== false;

        if (!nome) {
          if (window.notify) window.notify.warning('Nome da atividade é obrigatório');
          return;
        }

        try {
          await salvar({ id, idCurso, nome, ativo });
          if (window.notify) window.notify.success('Atividade salva com sucesso');
          limparFormulario();
          const lista = document.getElementById('activities-list');
          if (lista && idCurso) {
            await carregarLista(idCurso, lista);
          }
          if (typeof callbackAposSalvar === 'function') {
            callbackAposSalvar();
          }
        } catch (erro) {
          if (window.notify) window.notify.error(erro.message || 'Erro ao salvar atividade');
        }
      });
    }
  }

  function limparFormulario() {
    const idEl = document.getElementById('activity-id');
    const nameEl = document.getElementById('activity-name');
    const activeEl = document.getElementById('activity-active');
    const titleEl = document.getElementById('activity-form-title');

    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (activeEl) activeEl.checked = true;
    if (titleEl) titleEl.textContent = 'Cadastrar nova atividade';
  }

  function preencherFormulario(atividade) {
    const idEl = document.getElementById('activity-id');
    const nameEl = document.getElementById('activity-name');
    const activeEl = document.getElementById('activity-active');
    const titleEl = document.getElementById('activity-form-title');

    if (idEl) idEl.value = atividade.id || '';
    if (nameEl) nameEl.value = atividade.nome || '';
    if (activeEl) activeEl.checked = !!atividade.ativo;
    if (titleEl) titleEl.textContent = 'Editar atividade';

    nameEl?.focus();
  }

  async function carregarLista(idCurso, containerElement, opcoes = {}) {
    if (!containerElement) return [];
    const corpo = containerElement.querySelector('[data-grid-body]') || containerElement;
    corpo.innerHTML = '<p class="admin-empty-state">Carregando atividades...</p>';

    try {
      const atividades = await listar(idCurso);

      if (!atividades.length) {
        corpo.innerHTML = `
          <div class="empty-state empty-state--atividades admin-empty-state">
            <span class="icone empty-state__icon" data-icone="caixa-vazia" aria-hidden="true"></span>
            <p class="empty-state__title">Nenhuma atividade cadastrada</p>
            <p class="empty-state__description">Cadastre a primeira atividade deste curso.</p>
          </div>
        `;
        if (window.IconesCAIGE && typeof window.IconesCAIGE.aplicar === 'function') {
          window.IconesCAIGE.aplicar(containerElement);
        }
        return [];
      }

      corpo.innerHTML = atividades.map((a) => `
        <div class="modal-list-item data-grid__row admin-record ${a.ativo ? '' : 'inactive'}" data-activity-id="${a.id}">
          <div class="modal-list-item__title data-grid__cell" data-label="Atividade">${escapeHtml(a.nome)}</div>
          <div class="modal-list-item__meta data-grid__cell data-grid__cell--center" data-label="Status">
            <span class="activity-status-badge ${a.ativo ? 'activity-status-badge--active' : 'activity-status-badge--inactive'}">${a.ativo ? 'Ativa' : 'Inativa'}</span>
          </div>
          <div class="activity-row-actions data-grid__cell data-grid__cell--center" data-label="Ações">
            <button type="button" class="menu-acoes-trigger activity-actions-toggle" data-id="${a.id}" aria-label="Ações de ${escapeHtml(a.nome)}" aria-expanded="false"><span class="icone icone--sm" data-icone="menu" aria-hidden="true"></span></button>
          </div>
        </div>
      `).join('');

      window.IconesCAIGE?.aplicar?.(corpo);
      corpo.querySelectorAll('.activity-actions-toggle').forEach((botao) => {
        botao.addEventListener('click', () => {
          const id = Number(botao.dataset.id);
          const atividade = atividades.find((item) => Number(item.id) === id);
          if (!atividade || !window.MenuAcoes) return;

          MenuAcoes.abrir(botao, [
            {
              rotulo: 'Editar',
              acao: () => {
                if (typeof opcoes.aoEditar === 'function') opcoes.aoEditar(atividade);
                else preencherFormulario(atividade);
              }
            },
            {
              rotulo: 'Excluir',
              perigo: true,
              acao: async () => {
                const confirmado = window.confirm(`Excluir a atividade "${atividade.nome}"?`);
                if (!confirmado) return;
                try {
                  await excluir(id);
                  window.notify?.success?.('Atividade excluída com sucesso');
                  limparFormulario();
                  await carregarLista(idCurso, containerElement, opcoes);
                  if (typeof callbackAposSalvar === 'function') callbackAposSalvar();
                } catch (erro) {
                  window.notify?.error?.(erro.message || 'Erro ao excluir atividade');
                }
              }
            }
          ]);
        });
      });

      return atividades;
    } catch {
      corpo.innerHTML = '<p class="admin-empty-state">Erro ao carregar atividades.</p>';
      return [];
    }
  }

  function abrirModal(idCurso, nomeCurso, onSalvo = null, atividadeInicial = null) {
    const modal = garantirModalAtividades();
    callbackAposSalvar = onSalvo;

    const courseIdInput = document.getElementById('activities-course-id');
    const courseNameEl = document.getElementById('activities-course-name');
    const listContainer = document.getElementById('activities-list');

    if (courseIdInput) courseIdInput.value = idCurso;
    if (courseNameEl) courseNameEl.textContent = nomeCurso || '';
    limparFormulario();
    window.EstadoSessao?.salvar?.('gerenciamento', 'atividades-modal', { aberto: true, idCurso, nomeCurso: nomeCurso || '' });

    modal.classList.add('active');
    modal.style.display = 'flex';

    if (listContainer) {
      carregarLista(idCurso, listContainer);
    }

    if (atividadeInicial) {
      preencherFormulario(atividadeInicial);
    }
  }

  function fecharModal() {
    const modal = document.getElementById('modal-activities');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
    limparFormulario();
    window.EstadoSessao?.remover?.('gerenciamento', 'atividades-modal');
    window.EstadoSessao?.remover?.('gerenciamento', 'atividades-rascunho');
  }

  function salvarRascunho() {
    const modal = document.getElementById('modal-activities');
    if (!modal || modal.style.display === 'none') return;
    window.EstadoSessao?.salvar?.('gerenciamento', 'atividades-rascunho', {
      id: document.getElementById('activity-id')?.value || '',
      nome: document.getElementById('activity-name')?.value || '',
      ativo: document.getElementById('activity-active')?.checked !== false
    });
  }

  document.addEventListener('input', (event) => {
    if (event.target?.closest?.('#activity-form')) salvarRascunho();
  });
  document.addEventListener('change', (event) => {
    if (event.target?.closest?.('#activity-form')) salvarRascunho();
  });

  return {
    listar,
    salvar,
    excluir,
    abrirModal,
    fecharModal,
    carregarLista,
    limparFormulario,
    preencherFormulario,
    garantirModalAtividades
  };
})();

window.GerenciadorAtividades = GerenciadorAtividades;
window.openActivities = (idCurso, nomeCurso) => GerenciadorAtividades.abrirModal(idCurso, nomeCurso);
window.editarAtividade = (id, nome, ativo) => GerenciadorAtividades.preencherFormulario({ id, nome, ativo });
window.loadActivities = (idCurso) => GerenciadorAtividades.carregarLista(idCurso, document.getElementById('activities-list'));
