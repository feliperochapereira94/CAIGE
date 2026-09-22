// =========================================================
// CAIGE - LISTA DE PACIENTES
// =========================================================
//
// Globais reutilizados:
// - util-jwt.js       → autenticação;
// - paginacao.js      → paginação;
// - menu-acoes.js     → menu flutuante "⋮";
// - menu-usuario.js   → menu do usuário;
// - sidebar-menu.js   → navegação.
//
// Este arquivo contém apenas regras específicas de Pacientes.
// =========================================================

(() => {
  const API_URL = '';

  const tabela =
    document.getElementById('patient-table-body');

  const contadorTotal =
    document.getElementById('patient-count');

  const busca =
    document.getElementById('search-input');

  const filtroStatus =
    document.getElementById('filter-status');

  const ordenacao =
    document.getElementById('sort-order');

  let pacientes = [];
  let pacientesFiltrados = [];
  let paginacao = null;
  let restaurandoEstadoLista = true;
  const ESTADO_MODULO = 'pacientes';
  const ESTADO_ID = 'lista';

  function obterEstadoLista() {
    return window.EstadoSessao?.obter?.(ESTADO_MODULO, ESTADO_ID) || null;
  }

  function salvarEstadoLista() {
    if (restaurandoEstadoLista) return;
    window.EstadoSessao?.salvar?.(ESTADO_MODULO, ESTADO_ID, {
      busca: busca?.value || '',
      status: filtroStatus?.value ?? 'ativo',
      ordenacao: ordenacao?.value || '',
      paginaAtual: paginacao?.paginaAtual || 1,
      registrosPorPagina: paginacao?.tamanhoPagina || 10
    });
  }


  function texto(valor) {
    return String(valor ?? '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }


  function iniciaisPaciente(nome) {
    return window.PatientFormUtils?.obterIniciaisPaciente?.(nome, 'P') || 'P';
  }


  function atributo(valor) {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }




  function normalizarStatus(status) {
    const valor = texto(status);

    if (
      valor === 'arquivado' ||
      valor === 'archived'
    ) {
      return 'arquivado';
    }

    if (valor === 'inativo') {
      return 'inativo';
    }

    return 'ativo';
  }


  function badgeStatus(status) {
    const ativo =
      normalizarStatus(status) === 'ativo';

    return `
      <span
        class="status-pill
        ${ativo ? 'status-pill--success' : 'status-pill--warning'}"
      >
        ${ativo ? 'Ativo' : 'Inativo'}
      </span>
    `;
  }


  function enderecoPaciente(paciente) {
    if (paciente.address) {
      return paciente.address;
    }

    const partes = [
      paciente.neighborhood,
      paciente.city,
      paciente.state
    ].filter(Boolean);

    return partes.length
      ? partes.join(', ')
      : paciente.location ||
        'Endereço não informado';
  }


  function totalAtivos() {
    return pacientes.filter(
      (paciente) =>
        normalizarStatus(paciente.status) === 'ativo'
    ).length;
  }


  function atualizarContagem() {
    const total = totalAtivos();

    contadorTotal.textContent =
      `${total} paciente${total !== 1 ? 's' : ''} ativo${total !== 1 ? 's' : ''}`;
  }


  function renderizarPacientes(itens) {
    if (
      !Array.isArray(itens) ||
      itens.length === 0
    ) {
      tabela.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="pacientes-empty"
          >
            Nenhum paciente encontrado.
          </td>
        </tr>
      `;

      return;
    }

    tabela.innerHTML = itens.map((paciente) => {
      const endereco = enderecoPaciente(paciente);
      const nome = window.FormatadorTexto?.formatarNomePessoa
        ? window.FormatadorTexto.formatarNomePessoa(paciente.name, 'Sem nome')
        : String(paciente.name || 'Sem nome').trim();
      const enderecoExibicao = window.FormatadorTexto?.formatarEndereco
        ? window.FormatadorTexto.formatarEndereco(endereco)
        : String(endereco || '').trim();

      const temIdade = paciente.age !== null && paciente.age !== undefined && paciente.age !== '';
      const idadeTexto = temIdade ? `${paciente.age} anos` : '';
      const temTelefone = Boolean(paciente.phone && paciente.phone !== '-' && paciente.phone !== 'N/A');
      const telefoneLimpo = temTelefone ? String(paciente.phone).replace(/\D/g, '') : '';

      return `
        <tr
          class="paciente-row admin-record record-accent"
          data-id="${paciente.id}"
        >
          <td
            class="paciente-id-cell data-table__center"
            data-label="ID"
          >
            ${paciente.id}
          </td>

          <td class="paciente-name-cell" title="${atributo(nome)}">
            <div class="paciente-cell">
              <span class="paciente-avatar" aria-hidden="true">${paciente.photo ? `<img src="${atributo(paciente.photo)}" alt="" class="paciente-avatar__img" onerror="this.remove();this.parentElement.textContent=\'${atributo(iniciaisPaciente(nome))}\'">` : atributo(iniciaisPaciente(nome))}</span>
              <div class="paciente-info">
                <span class="paciente-name">${nome}</span>
              </div>
            </div>
          </td>

          <td
            class="paciente-address-cell"
            data-label="Endereço"
            title="${atributo(enderecoExibicao)}"
          >
            <span class="paciente-address-text">${enderecoExibicao}</span>
          </td>

          <td
            class="paciente-meta-cell data-table__center"
            data-label="Idade"
          >
            <span class="paciente-meta-desktop">${paciente.age ?? '-'}</span>
            <div class="paciente-meta-mobile">
              ${idadeTexto ? `<span class="paciente-meta-idade">${idadeTexto}</span>` : ''}
              ${idadeTexto && temTelefone ? `<span class="paciente-meta-bullet" aria-hidden="true">•</span>` : ''}
              ${temTelefone ? `
                <a href="tel:${atributo(telefoneLimpo)}" class="paciente-phone-link">
                  ${atributo(paciente.phone)}
                </a>
              ` : (!temIdade ? `<span class="paciente-phone-empty">Não informado</span>` : '')}
            </div>
          </td>

          <td
            class="paciente-phone-cell data-table__center"
            data-label="Telefone"
          >
            <span class="paciente-phone-desktop">${paciente.phone || '-'}</span>
          </td>

          <td class="paciente-status-cell data-table__center">
            ${badgeStatus(paciente.status)}
          </td>

          <td class="pacientes-actions-col data-table__center">
            <div class="paciente-actions-wrap">
              <button
                class="admin-row-actions-toggle paciente-actions-toggle"
                type="button"
                data-action="more"
                data-id="${paciente.id}"
                aria-label="Ações de ${atributo(nome)}"
                title="Ações"
              >
                <span class="icone icone--sm" data-icone="menu" aria-hidden="true"></span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    window.IconesCAIGE?.aplicar?.(tabela);
  }


  function configurarPaginacao() {
    if (
      paginacao ||
      typeof window.PaginacaoLista === 'undefined'
    ) {
      return;
    }

    paginacao = new window.PaginacaoLista({
      seletorQuantidade: '#patients-page-size',
      seletorPaginacao: '#patients-pagination',
      seletorIndicador: '#patients-page-indicator',
      seletorPrimeira: '#patients-first-page',
      seletorAnterior: '#patients-prev-page',
      seletorProxima: '#patients-next-page',
      seletorUltima: '#patients-last-page',
      tamanhoPadrao: 10,
      rotuloSingular: 'registro',
      rotuloPlural: 'registros',
      aoRenderizar: (itens, meta) => {
        renderizarPacientes(itens);
        if (!restaurandoEstadoLista && meta) salvarEstadoLista();
      }
    });

    const estado = obterEstadoLista();
    if (estado?.registrosPorPagina) {
      const tamanho = Number(estado.registrosPorPagina);
      if (paginacao.opcoesQuantidade.includes(tamanho)) {
        paginacao.tamanhoPagina = tamanho;
        const seletor = document.getElementById('patients-page-size');
        if (seletor) seletor.value = String(tamanho);
        paginacao._atualizarRotuloQuantidade?.();
        paginacao._renderizarOpcoesQuantidade?.();
      }
    }
  }


  function ordenar(lista) {
    const resultado = [...lista];

    switch (ordenacao.value) {
      case 'desc':
        resultado.sort(
          (a, b) =>
            String(b.name || '').localeCompare(
              String(a.name || ''),
              'pt-BR'
            )
        );
        break;

      case 'newest':
        resultado.sort(
          (a, b) =>
            Number(b.id || 0) -
            Number(a.id || 0)
        );
        break;

      case 'oldest':
        resultado.sort(
          (a, b) =>
            Number(a.id || 0) -
            Number(b.id || 0)
        );
        break;

      case 'asc':
      default:
        resultado.sort(
          (a, b) =>
            String(a.name || '').localeCompare(
              String(b.name || ''),
              'pt-BR'
            )
        );
        break;
    }

    return resultado;
  }


  function correspondeBusca(paciente, termo) {
    if (!termo) {
      return true;
    }

    const campos = [
      paciente.id,
      paciente.name,
      paciente.phone,
      paciente.phone2,
      paciente.cpf,
      paciente.neighborhood,
      paciente.city,
      paciente.state,
      paciente.street,
      paciente.address,
      paciente.location,
      paciente.status
    ];

    return campos.some(
      (campo) =>
        texto(campo).includes(termo)
    );
  }


  function filtrar() {
    const termo =
      texto(busca.value);

    const statusFiltro =
      normalizarStatus(
        filtroStatus.value
      );

    const filtroTodos =
      filtroStatus.value === '';

    let resultado =
      pacientes.filter((paciente) => {
        const statusPaciente =
          normalizarStatus(
            paciente.status
          );

        if (statusPaciente === 'arquivado') {
          return false;
        }

        const bateBusca =
          correspondeBusca(
            paciente,
            termo
          );

        const bateStatus =
          filtroTodos ||
          statusPaciente === statusFiltro;

        return bateBusca && bateStatus;
      });

    resultado = ordenar(resultado);

    pacientesFiltrados = resultado;

    atualizarContagem();

    configurarPaginacao();

    if (paginacao) {
      paginacao.definirItens(
        pacientesFiltrados
      );
    } else {
      renderizarPacientes(
        pacientesFiltrados
      );
    }
  }


  async function carregarPacientes() {
    tabela.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="pacientes-empty"
        >
          Carregando pacientes...
        </td>
      </tr>
    `;

    try {
      const resposta = await fetch(
        `${API_URL}/api/pacientes?limit=100`
      );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.message ||
          'Erro ao carregar pacientes.'
        );
      }

      pacientes =
        Array.isArray(dados)
          ? dados
          : [];

      filtrar();

      const estado = obterEstadoLista();
      if (estado?.paginaAtual && paginacao) {
        paginacao.paginaAtual = Math.max(1, Number(estado.paginaAtual) || 1);
        paginacao.renderizar();
      }
      restaurandoEstadoLista = false;
      salvarEstadoLista();
    } catch (erro) {
      console.error(
        'Erro ao carregar pacientes:',
        erro
      );

      pacientes = [];
      pacientesFiltrados = [];

      atualizarContagem();
      renderizarPacientes([]);

      if (
        typeof notify !== 'undefined' &&
        notify?.error
      ) {
        notify.error(
          'Não foi possível carregar os pacientes.'
        );
      }
    }
  }


  function abrirPaciente(id) {
    if (!id) {
      return;
    }

    window.location.href =
      `./visualizar.html?id=${id}`;
  }


  function editarPaciente(id) {
    if (!id) {
      return;
    }

    window.location.href =
      `./editar.html?id=${id}`;
  }


  async function arquivarPaciente(id) {
    const paciente =
      pacientes.find(
        (item) =>
          String(item.id) === String(id)
      );

    const statusPaciente =
      normalizarStatus(
        paciente?.status
      );

    if (statusPaciente !== 'inativo') {
      if (
        typeof notify !== 'undefined' &&
        notify?.error
      ) {
        notify.error(
          'Apenas pacientes inativos podem ser arquivados.'
        );
      }
      return;
    }

    const nome =
      paciente?.name ||
      'este paciente';

    let confirmar = false;
    if (window.ModalConfirmacao && typeof window.ModalConfirmacao.confirmar === 'function') {
      confirmar = await window.ModalConfirmacao.confirmar({
        titulo: 'Arquivar Paciente',
        mensagem: `Deseja arquivar ${nome}? O paciente sairá da listagem operacional e ficará disponível na área de Arquivados.`,
        variante: 'aviso',
        textoConfirmar: 'Arquivar',
        textoCancelar: 'Cancelar',
        icone: 'arquivar'
      });
    }

    if (!confirmar) {
      return;
    }

    try {
      const resposta = await fetch(
        `${API_URL}/api/pacientes/${id}`,
        {
          method: 'DELETE'
        }
      );

      const dados =
        await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados?.message ||
          'Não foi possível arquivar o paciente.'
        );
      }

      if (
        typeof notify !== 'undefined' &&
        notify?.success
      ) {
        notify.success(
          'Paciente arquivado com sucesso.'
        );
      }

      await carregarPacientes();
    } catch (erro) {
      console.error(
        'Erro ao arquivar paciente:',
        erro
      );

      if (
        typeof notify !== 'undefined' &&
        notify?.error
      ) {
        notify.error(
          erro.message ||
          'Erro ao arquivar paciente.'
        );
      }
    }
  }


  tabela.addEventListener(
    'click',
    (evento) => {
      const botao =
        evento.target.closest(
          '[data-action="more"]'
        );

      if (!botao) {
        return;
      }

      evento.stopPropagation();

      const id = botao.dataset.id;

      if (
        !id ||
        typeof window.MenuAcoes === 'undefined'
      ) {
        return;
      }

      const paciente =
        pacientes.find(
          (item) =>
            String(item.id) === String(id)
        );

      const statusPaciente =
        normalizarStatus(
          paciente?.status
        );

      const opcoes = [
        {
          rotulo: 'Ver perfil',
          acao: () => abrirPaciente(id)
        },
        {
          rotulo: 'Ver prontuário',
          acao: () => {
            window.location.href = `./prontuario.html?id=${id}`;
          }
        },
        {
          rotulo: 'Editar cadastro',
          acao: () => editarPaciente(id)
        }
      ];

      if (statusPaciente === 'inativo') {
        opcoes.push({
          rotulo: 'Arquivar',
          perigo: true,
          acao: () => arquivarPaciente(id)
        });
      }

      window.MenuAcoes.abrir(
        botao,
        opcoes
      );
    }
  );


  busca.addEventListener(
    'input',
    () => {
      filtrar();
      salvarEstadoLista();
    }
  );

  filtroStatus.addEventListener(
    'change',
    () => {
      filtrar();
      salvarEstadoLista();
    }
  );

  ordenacao.addEventListener(
    'change',
    () => {
      filtrar();
      salvarEstadoLista();
    }
  );


  const estadoInicialLista = obterEstadoLista();
  busca.value = estadoInicialLista?.busca || '';
  filtroStatus.value = estadoInicialLista?.status ?? 'ativo';
  if (estadoInicialLista?.ordenacao) {
    ordenacao.value = estadoInicialLista.ordenacao;
  }

  if (
    typeof window.UtilJWT !== 'undefined'
  ) {
    window.UtilJWT.exigirSessao();
  }

  carregarPacientes();
})();
