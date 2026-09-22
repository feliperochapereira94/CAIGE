(function () {
  const API_URL = '';
  const API_PROFILE = '/api/autenticacao/perfil';
  const API_COURSES = '/api/cursos';

  let patientId = null;
  let patientData = null;
  let gerenciadorQuestionarios = null;
  let currentQuestionnaireId = null;
  let currentUserRole = null;
  let currentUserCourseId = null;
  let availableCourses = [];
  let publishedQuestionnaires = [];
  let patientHistory = [];
  let pendingLaunchCourseId = null;
  let pendingCompareCourseId = null;
  let documentViewerRecords = [];
  let preferredOpenCourseId = null;
  const expandedHistoryCourseIds = new Set();

  function salvarEstadoAcordeoes() {
    if (typeof EstadoSessao === 'undefined' || !patientId) return;
    EstadoSessao.salvar('prontuarios', `paciente-${patientId}`, {
      cursoAberto: preferredOpenCourseId || null,
      historicosExpandidos: Array.from(expandedHistoryCourseIds)
    });
  }

  function restaurarEstadoAcordeoes() {
    if (typeof EstadoSessao === 'undefined' || !patientId) return;
    const estado = EstadoSessao.obter('prontuarios', `paciente-${patientId}`);
    preferredOpenCourseId = Number(estado?.cursoAberto) || null;
    expandedHistoryCourseIds.clear();
    (Array.isArray(estado?.historicosExpandidos) ? estado.historicosExpandidos : [])
      .forEach((id) => {
        const numericId = Number(id);
        if (numericId) expandedHistoryCourseIds.add(numericId);
      });
  }
  const HISTORY_PREVIEW_LIMIT = 4;

  function getIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  function esc(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getDateParts(dateValue) {
    if (!dateValue) return null;

    const raw = typeof dateValue === 'string'
      ? dateValue
      : new Date(dateValue).toISOString();

    const [year, month, day] = raw.split('T')[0].split('-');

    if (!year || !month || !day) return null;

    return {
      year: Number(year),
      month: Number(month),
      day: Number(day)
    };
  }

  function formatBirthDate(dateValue) {
    const parts = getDateParts(dateValue);
    if (!parts) return '-';

    return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
  }

  function calculateAge(dateValue) {
    if (window.PatientFormUtils?.calcularIdade) {
      return window.PatientFormUtils.calcularIdade(dateValue);
    }
    return null;
  }


  function toValidDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    const date = toValidDate(value);
    return date ? date.toLocaleDateString('pt-BR') : '-';
  }

  function formatTime(value) {
    const date = toValidDate(value);

    return date
      ? date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';
  }

  function formatCount(value, singular, plural) {
    const amount = Number(value) || 0;
    return `${amount} ${amount === 1 ? singular : plural}`;
  }

  function formatDateTime(value) {
    const date = toValidDate(value);

    if (!date) return '-';

    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    )}`;
  }

  function dateGroupKey(value) {
    const date = toValidDate(value);
    if (!date) return 'sem-data';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async function loadPatient() {
    patientId = getIdFromURL();

    if (!patientId) {
      notify.error('ID do paciente não encontrado');
      window.location.href = './lista.html';
      return null;
    }

    localStorage.setItem('selectedPatientId', String(patientId));

    const response = await fetch(`${API_URL}/api/pacientes/${patientId}`);

    if (!response.ok) {
      notify.error('Paciente não encontrado');
      window.location.href = './lista.html';
      return null;
    }

    patientData = await response.json();
    return patientData;
  }

  async function loadProfile() {
    const response = await fetch(API_PROFILE);

    if (!response.ok) {
      throw new Error('Não foi possível carregar o perfil do usuário');
    }

    const profile = await response.json();

    currentUserRole =
      profile.role ||
      profile.papel ||
      null;

    currentUserCourseId = Number(
      profile.idCurso ||
      profile.id_curso ||
      0
    ) || null;
  }

  async function loadCourses() {
    const response = await fetch(API_COURSES);

    if (!response.ok) {
      throw new Error('Não foi possível carregar os cursos');
    }

    const data = await response.json();

    availableCourses = Array.isArray(data)
      ? data
      : (data.cursos || []);
  }

  function getCourseName(courseId) {
    const course = availableCourses.find(
      (item) => Number(item.id) === Number(courseId)
    );

    return (
      course?.nome ||
      course?.name ||
      `Curso ${courseId}`
    );
  }

  function populatePatientHeader(data) {
    const profileName = document.getElementById('profile-name');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileAge = document.getElementById('profile-age');
    const profileBirth = document.getElementById('profile-birth');
    const profileGender = document.getElementById('profile-gender');

    const nomeFormatado = window.FormatadorTexto?.formatarNomePessoa?.(data.name) || data.name || 'Paciente';
    profileName.textContent = nomeFormatado || 'Paciente';

    const initials = window.PatientFormUtils?.obterIniciaisPaciente?.(nomeFormatado, '--') || '--';
    const photoUrl = data.photo || null;

    profileAvatar.textContent = initials;
    profileAvatar.classList.remove('profile-avatar--photo');

    if (photoUrl) {
      const photoEl = document.createElement('img');
      photoEl.src = photoUrl;
      photoEl.alt = 'Foto do paciente';
      photoEl.className = 'profile-avatar-img';
      photoEl.addEventListener('load', () => {
        profileAvatar.textContent = '';
        profileAvatar.appendChild(photoEl);
        profileAvatar.classList.add('profile-avatar--photo');
      }, { once: true });
      photoEl.addEventListener('error', () => {
        profileAvatar.textContent = initials;
        profileAvatar.classList.remove('profile-avatar--photo');
      }, { once: true });
    }

    const age = calculateAge(data.birth_date);
    profileAge.textContent = age !== null ? `${age} anos` : '-';
    profileBirth.textContent = formatBirthDate(data.birth_date);
    profileGender.textContent = window.FormatadorTexto?.formatarValorApresentacao?.(data.gender, '-') || data.gender || '-';

    const mobileBackProfile = document.getElementById('mobile-back-profile');
    if (mobileBackProfile) {
      mobileBackProfile.href = `./visualizar.html?id=${patientId}`;
    }

    const prontuarioMobileMenu = document.getElementById('prontuario-mobile-menu');
    if (prontuarioMobileMenu && !prontuarioMobileMenu.dataset.bound) {
      prontuarioMobileMenu.dataset.bound = 'true';
      prontuarioMobileMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!window.MenuAcoes) return;
        MenuAcoes.abrir(prontuarioMobileMenu, [
          {
            rotulo: 'Ver Perfil',
            icone: 'visualizar',
            acao: () => { window.location.href = `./visualizar.html?id=${patientId}`; }
          },
          {
            rotulo: 'Lista de Pacientes',
            icone: 'pacientes',
            acao: () => { window.location.href = './lista.html'; }
          }
        ]);
      });
    }
  }

  function renderizarItensClinicos(idContainer, valor, opcoes = {}) {
    const container = document.getElementById(idContainer);
    if (!container) return;

    const itens = PatientFormUtils.separarListaClinica(valor);
    container.innerHTML = '';

    if (itens.length === 0) {
      const vazio = document.createElement('span');
      vazio.className = 'clinical-summary__empty';
      vazio.textContent = opcoes.avaliado
        ? (opcoes.textoSemOcorrencia || 'Nenhuma ocorrência informada')
        : 'Não informado';
      container.appendChild(vazio);
      return;
    }

    if (opcoes.lista) {
      const lista = document.createElement('ul');
      lista.className = 'clinical-summary__list';

      itens.forEach((item) => {
        const entrada = document.createElement('li');
        entrada.textContent = item;
        lista.appendChild(entrada);
      });

      container.appendChild(lista);
      return;
    }

    itens.forEach((item) => {
      const marcador = document.createElement('span');
      marcador.className = 'clinical-chip';
      if (opcoes.perigo) {
        marcador.classList.add('clinical-chip--danger');
      }
      marcador.textContent = item;
      container.appendChild(marcador);
    });
  }

  function renderizarResumoClinico(data) {
    renderizarItensClinicos('clinical-health-conditions', data.health_conditions, {
      avaliado: Boolean(data.health_conditions_evaluated),
      textoSemOcorrencia: 'Nenhuma condição informada'
    });
    renderizarItensClinicos('clinical-allergies', data.allergies, {
      perigo: true,
      avaliado: Boolean(data.allergies_evaluated),
      textoSemOcorrencia: 'Nenhuma alergia conhecida'
    });
    renderizarItensClinicos('clinical-medications', data.medications_in_use, {
      lista: true,
      avaliado: Boolean(data.medications_in_use_evaluated),
      textoSemOcorrencia: 'Não utiliza medicamentos'
    });

    const observacoes = document.getElementById('clinical-observations');
    if (observacoes) {
      observacoes.textContent = data.clinical_observations?.trim() || 'Não informado';
    }

    const valorImc = document.getElementById('resumo-clinico-imc');
    const badgeImc = document.getElementById('resumo-clinico-imc-classificacao');
    const medidas = document.getElementById('resumo-clinico-medidas');

    const imc = window.PatientFormUtils?.calcularIMC
      ? window.PatientFormUtils.calcularIMC(data.weight_kg, data.height_cm)
      : null;

    if (valorImc) {
      if (imc !== null) {
        valorImc.textContent = imc.toLocaleString('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        });
        const classificacao = window.PatientFormUtils?.classificarIMC?.(imc, data.birth_date);
        if (badgeImc && classificacao) {
          badgeImc.className = `status-pill ${classificacao.classe}`;
          badgeImc.textContent = classificacao.rotulo;
          badgeImc.hidden = false;
        } else if (badgeImc) {
          badgeImc.hidden = true;
          badgeImc.textContent = '';
        }
      } else {
        valorImc.textContent = 'Não calculado';
        if (badgeImc) {
          badgeImc.hidden = true;
          badgeImc.textContent = '';
        }
      }
    }

    const peso = Number(data.weight_kg);
    const alturaCm = Number(data.height_cm);
    const temPeso = Number.isFinite(peso) && peso > 0;
    const temAltura = Number.isFinite(alturaCm) && alturaCm > 0;

    if (medidas) {
      const partes = [];
      if (temPeso) {
        partes.push(`${peso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`);
      }
      if (temAltura) {
        partes.push(`${alturaCm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm`);
      }
      medidas.textContent = partes.join(' • ');
    }
  }

  async function initializeQuestionnaires() {
    if (!patientData) return;

    gerenciadorQuestionarios = new GerenciadorQuestionarios();
    await gerenciadorQuestionarios.inicializar(patientData);

    await refreshClinicalTimeline();
  }

  async function refreshClinicalTimeline() {
    const container = document.getElementById('course-accordion');

    container.innerHTML = `
      <div class="questionnaire-empty">
        <div class="questionnaire-empty__icon">
          <span class="loading-spinner" aria-hidden="true"></span>
        </div>
        <div class="questionnaire-empty__text">
          Carregando evolução do paciente...
        </div>
      </div>
    `;

    try {
      [publishedQuestionnaires, patientHistory] = await Promise.all([
        gerenciadorQuestionarios.listarQuestionariosPublicados(),
        gerenciadorQuestionarios.obterHistoricoPaciente()
      ]);

      buildCourseAccordion();
    } catch (error) {
      console.error(error);

      container.innerHTML = `
        <div class="questionnaire-empty">
          <div class="questionnaire-empty__icon">
            <span class="icone icone--lg icone--perigo" data-icone="alerta" aria-hidden="true"></span>
          </div>
          <div class="questionnaire-empty__text">
            Erro ao carregar os prontuários do paciente.
          </div>
        </div>
      `;

      window.IconesCAIGE?.aplicar(container);
    }
  }

  function buildCourseAccordion() {
    const container = document.getElementById('course-accordion');
    const groups = new Map();

    patientHistory.forEach((record) => {
      const courseId = Number(record.idCurso);
      if (!courseId) return;

      const group = groups.get(courseId) || {
        id: courseId,
        name: record.course_name || getCourseName(courseId),
        records: [],
        questionnaires: []
      };

      group.records.push(record);
      groups.set(courseId, group);
    });

    publishedQuestionnaires.forEach((questionnaire) => {
      const courseId = Number(questionnaire.idCurso);
      if (!courseId) return;

      const group = groups.get(courseId) || {
        id: courseId,
        name: questionnaire.course_name || getCourseName(courseId),
        records: [],
        questionnaires: []
      };

      group.questionnaires.push(questionnaire);
      groups.set(courseId, group);
    });

    // O profissional precisa enxergar o card do próprio curso mesmo
    // quando ainda não existe histórico e nenhum modelo foi publicado.
    // Assim a tela explica por que o lançamento ainda não está disponível.
    if (currentUserCourseId && !groups.has(currentUserCourseId)) {
      groups.set(currentUserCourseId, {
        id: currentUserCourseId,
        name: getCourseName(currentUserCourseId),
        records: [],
        questionnaires: []
      });
    }

    if (!groups.size) {
      container.innerHTML = `
        <div class="questionnaire-empty">
          <div class="questionnaire-empty__icon">
            <span class="icone icone--lg icone--suave" data-icone="prontuario" aria-hidden="true"></span>
          </div>
          <div class="questionnaire-empty__text">
            Nenhum registro de prontuário encontrado.
          </div>
          <div class="questionnaire-empty__subtext">
            O histórico aparecerá aqui conforme os profissionais realizarem os lançamentos.
          </div>
        </div>
      `;
      window.IconesCAIGE?.aplicar(container);
      return;
    }

    const orderedGroups = Array.from(groups.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    let openedOne = false;

    container.innerHTML = orderedGroups.map((group) => {
      const canRegister =
        currentUserRole === 'SUPERVISOR' ||
        (
          currentUserCourseId &&
          Number(currentUserCourseId) === Number(group.id)
        );

      const isPreferred =
        preferredOpenCourseId &&
        Number(preferredOpenCourseId) === Number(group.id);

      const isOpen = Boolean(isPreferred);

      if (isOpen) {
        openedOne = true;
      }

      return renderCourseGroup(group, canRegister, isOpen);
    }).join('');

    window.IconesCAIGE?.aplicar(container);
    bindCourseAccordionEvents(container);
  }

  function renderCourseGroup(group, canRegister, isOpen) {
    const recordsCount = group.records.length;
    let latestDateStr = null;
    if (recordsCount > 0) {
      const latestRecord = group.records.reduce((latest, current) => {
        const dCur = new Date(current.created_at).getTime();
        const dLat = new Date(latest.created_at).getTime();
        return dCur > dLat ? current : latest;
      }, group.records[0]);
      if (latestRecord && latestRecord.created_at) {
        const formatted = formatDate(latestRecord.created_at);
        if (formatted && formatted !== '-') {
          latestDateStr = `Último em ${formatted}`;
        }
      }
    }
    const subtext = latestDateStr || 'Nenhum lançamento registrado';
    const hasActions = canRegister || recordsCount >= 2;

    return `
      <section class="course-accordion ${isOpen ? 'open' : ''}"
        data-course-id="${group.id}"
        data-can-register="${canRegister ? 'true' : 'false'}">
        <div class="course-accordion__header">
          <button class="course-accordion__toggle" type="button"
            aria-expanded="${isOpen}">
            <div class="course-accordion__header-main">
              <div class="course-accordion__header-row">
                <span class="course-accordion__title">
                  ${esc(group.name)}
                </span>
                <span class="course-accordion__badge">
                  ${formatCount(recordsCount, 'registro', 'registros')}
                </span>
              </div>
              <span class="course-accordion__subtext">${esc(subtext)}</span>
            </div>

            <span class="course-accordion__chevron icone icone--sm" data-icone="chevron-direita" aria-hidden="true"></span>
          </button>

          ${hasActions ? `
            <button class="btn-alt menu-acoes-trigger course-accordion__menu" type="button"
              data-course-actions="${group.id}"
              aria-label="Ações de ${esc(group.name)}"
              title="Ações">
              <span class="icone icone--sm" data-icone="menu" aria-hidden="true"></span>
            </button>
          ` : ''}
        </div>

        <div class="course-accordion__body">
          ${renderCourseHistory(group.records, group.id)}
        </div>
      </section>
    `;
  }

  function canRegisterInCourse(courseId) {
    return (
      currentUserRole === 'SUPERVISOR' ||
      (
        currentUserRole === 'PROFESSOR' &&
        currentUserCourseId &&
        Number(currentUserCourseId) === Number(courseId)
      )
    );
  }

  function getPublishedQuestionnairesByCourse(courseId) {
    return publishedQuestionnaires
      .filter(
        (questionnaire) =>
          Number(questionnaire.idCurso) === Number(courseId)
      )
      .sort(
        (a, b) =>
          String(a.title || '').localeCompare(
            String(b.title || ''),
            'pt-BR'
          )
      );
  }

  function openLaunchSelectionModal(courseId) {
    if (!canRegisterInCourse(courseId)) {
      notify.error('Você não possui permissão para lançar prontuários neste curso.');
      return;
    }

    pendingLaunchCourseId = Number(courseId);
    preferredOpenCourseId = Number(courseId);

    const courseName = getCourseName(courseId);
    const questionnaires = getPublishedQuestionnairesByCourse(courseId);
    const optionsContainer = document.getElementById('launch-questionnaire-options');
    const proceedButton = document.getElementById('btn-proceed-launch-select');

    document.getElementById('launch-select-course-name').textContent =
      `${courseName} • selecione um prontuário publicado.`;

    proceedButton.disabled = true;

    if (!questionnaires.length) {
      optionsContainer.innerHTML = `
        <div class="questionnaire-empty">
          <div class="questionnaire-empty__text">
            Nenhum prontuário publicado está disponível para este curso.
          </div>
          <div class="questionnaire-empty__subtext">
            Publique um modelo na Gestão de Prontuários antes de realizar o lançamento.
          </div>
        </div>
      `;
    } else {
      optionsContainer.innerHTML = questionnaires
        .map((questionnaire) => `
          <label class="prontuario-selection-option">
            <input type="radio" name="launch-questionnaire"
              value="${questionnaire.id}" />

            <span class="prontuario-selection-option__content">
              <strong>${esc(questionnaire.title || 'Prontuário')}</strong>
              <span>
                ${esc(questionnaire.description || 'Sem descrição')}
              </span>
            </span>
          </label>
        `)
        .join('');
    }

    document.getElementById('modal-launch-select').style.display = 'flex';
  }

  function closeLaunchSelectionModal() {
    document.getElementById('modal-launch-select').style.display = 'none';
    document.getElementById('launch-questionnaire-options').innerHTML = '';
    document.getElementById('btn-proceed-launch-select').disabled = true;
    pendingLaunchCourseId = null;
  }

  function proceedLaunchSelection() {
    const selected = document.querySelector(
      'input[name="launch-questionnaire"]:checked'
    );

    const questionnaireId = Number(selected?.value);

    if (!questionnaireId || !pendingLaunchCourseId) {
      notify.info('Selecione um prontuário para prosseguir.');
      return;
    }

    const questionnaire = publishedQuestionnaires.find(
      (item) =>
        Number(item.id) === questionnaireId &&
        Number(item.idCurso) === Number(pendingLaunchCourseId)
    );

    if (!questionnaire) {
      notify.error('O prontuário selecionado não está mais disponível.');
      return;
    }

    closeLaunchSelectionModal();

    openQuestionnaireForm(questionnaireId, {
      title: questionnaire.title || 'Prontuário',
      description: questionnaire.description || ''
    });
  }

  function getCourseRecords(courseId) {
    return patientHistory.filter(
      (record) => Number(record.idCurso) === Number(courseId)
    );
  }

  function toggleCourseHistory(courseId) {
    const numericCourseId = Number(courseId);

    if (expandedHistoryCourseIds.has(numericCourseId)) {
      expandedHistoryCourseIds.delete(numericCourseId);
    } else {
      expandedHistoryCourseIds.add(numericCourseId);
    }

    preferredOpenCourseId = numericCourseId;
    salvarEstadoAcordeoes();
    buildCourseAccordion();
  }

  function renderCourseHistory(records, courseId) {
    if (!records.length) {
      return `
        <section class="clinical-history">
          <div class="clinical-history__empty">
            Nenhum lançamento registrado neste curso.
          </div>
        </section>
      `;
    }

    const expanded = expandedHistoryCourseIds.has(Number(courseId));
    const visibleRecords = expanded
      ? records
      : records.slice(0, HISTORY_PREVIEW_LIMIT);
    const hiddenCount = Math.max(0, records.length - visibleRecords.length);
    const groupsByDate = new Map();

    visibleRecords.forEach((record) => {
      const key = dateGroupKey(record.created_at);
      const group = groupsByDate.get(key) || [];

      group.push(record);
      groupsByDate.set(key, group);
    });

    const dates = Array.from(groupsByDate.entries())
      .sort(([a], [b]) => b.localeCompare(a));

    return `
      <section class="clinical-history">
        ${dates.map(([, entries]) => `
          <div class="clinical-history-day">
            <div class="clinical-history-day__date">
              ${esc(formatDate(entries[0]?.created_at))}
            </div>

            <div class="clinical-history-day__records">
              ${entries.map(renderHistoryRecord).join('')}
            </div>
          </div>
        `).join('')}

        ${records.length > HISTORY_PREVIEW_LIMIT ? `
          <button class="clinical-history__toggle" type="button"
            data-history-toggle-course="${Number(courseId)}">
            ${expanded
              ? 'Mostrar menos'
              : `Ver mais ${formatCount(hiddenCount, 'lançamento', 'lançamentos')}`}
          </button>
        ` : ''}
      </section>
    `;
  }

  function renderHistoryRecord(record) {
    return `
      <article class="clinical-history-record">
        <button class="clinical-history-record__button" type="button"
          data-history-record="${record.id}">
          <div class="clinical-history-record__content">
            <strong class="clinical-history-record__title">
              ${esc(record.questionnaire_title || 'Prontuário')}
            </strong>

            <span class="clinical-history-record__professional">
              ${esc(record.professional_name || 'Profissional não identificado')}
            </span>
          </div>

          <span class="clinical-history-record__meta">
            <time>${esc(formatTime(record.created_at))}</time>

            <span class="clinical-history-record__view">
              <span class="icone icone--xs" data-icone="visualizar" aria-hidden="true"></span>
              Visualizar
            </span>
          </span>
        </button>
      </article>
    `;
  }

  function bindCourseAccordionEvents(container) {
    container.querySelectorAll('.course-accordion__toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const accordion = button.closest('.course-accordion');
        const opening = !accordion.classList.contains('open');

        accordion.classList.toggle('open', opening);
        button.setAttribute('aria-expanded', opening ? 'true' : 'false');

        if (opening) {
          preferredOpenCourseId = Number(accordion.dataset.courseId);
        } else if (Number(preferredOpenCourseId) === Number(accordion.dataset.courseId)) {
          preferredOpenCourseId = null;
        }
        salvarEstadoAcordeoes();
      });
    });

    container.querySelectorAll('[data-course-actions]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();

        const courseId = Number(
          button.getAttribute('data-course-actions')
        );

        const accordion = button.closest('.course-accordion');
        const canRegister =
          accordion?.dataset.canRegister === 'true';
        const actions = [];

        if (canRegister) {
          actions.push({
            rotulo: 'Lançar prontuário',
            acao: () => openLaunchSelectionModal(courseId)
          });
        }

        if (patientHistory.length >= 2) {
          actions.push({
            rotulo: 'Comparar prontuários',
            acao: () => openCompareSelectionModal()
          });
        }

        if (window.MenuAcoes) {
          window.MenuAcoes.abrir(button, actions);
        }
      });
    });

    container.querySelectorAll('[data-history-record]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = Number(button.getAttribute('data-history-record'));
        const record = patientHistory.find(
          (item) => Number(item.id) === id
        );

        if (record) {
          openDocumentViewer([record]);
        }
      });
    });

    container.querySelectorAll('[data-history-toggle-course]').forEach((button) => {
      button.addEventListener('click', () => {
        toggleCourseHistory(
          Number(button.getAttribute('data-history-toggle-course'))
        );
      });
    });
  }

  function openCompareSelectionModal() {
    const records = [...patientHistory]
      .filter((record) => record && record.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (records.length < 2) {
      notify.info('É necessário ter pelo menos dois prontuários para comparar.');
      return;
    }

    pendingCompareCourseId = null;

    document.getElementById('compare-course-name').textContent =
      'Selecione 2 ou mais prontuários, inclusive de cursos diferentes.';

    const groupedRecords = records.reduce((groups, record) => {
      const courseId = Number(record.idCurso || record.course_id || 0);
      const courseName = record.course_name || getCourseName(courseId) || 'Curso não identificado';
      const key = `${courseId}:${courseName}`;

      if (!groups[key]) {
        groups[key] = { courseId, courseName, records: [] };
      }

      groups[key].records.push(record);
      return groups;
    }, {});

    document.getElementById('compare-record-options').innerHTML = Object.values(groupedRecords)
      .sort((a, b) => a.courseName.localeCompare(b.courseName, 'pt-BR'))
      .map((group, index) => `
        <section class="compare-course-group">
          <button type="button" class="compare-course-group__header" aria-expanded="false">
            <span class="compare-course-group__title">
              <strong>${esc(group.courseName)}</strong>
              <span>${group.records.length} ${group.records.length === 1 ? 'prontuário' : 'prontuários'}</span>
            </span>
            <span class="compare-course-group__selection" data-course-selection-count></span>
            <span class="compare-course-group__chevron" aria-hidden="true"><span class="compare-course-group__chevron-icon"></span></span>
          </button>

          <div class="compare-course-group__body" hidden>
            <div class="compare-course-selection-actions" role="group" aria-label="Ações de seleção do curso">
              <button type="button" class="compare-course-selection-action" data-select-course-all>Selecionar todos</button>
              <button type="button" class="compare-course-selection-action compare-course-selection-action--clear" data-clear-course-selection disabled>Limpar seleção</button>
            </div>

            <div class="compare-course-group__records">
              ${group.records.map((record) => `
                <label class="prontuario-selection-option">
                  <input type="checkbox" name="compare-record" value="${record.id}" />
                  <span class="prontuario-selection-option__content compare-prontuario-row">
                    <strong>${esc(record.questionnaire_title || 'Prontuário')}</strong>
                    <span class="compare-prontuario-row__date">${esc(formatDateTime(record.created_at))}</span>
                  </span>
                </label>
              `).join('')}
            </div>
          </div>
        </section>
      `)
      .join('');

    initializeCompareCourseGroups();

    updateCompareSelectionState();
    document.getElementById('modal-compare-select').style.display = 'flex';
  }

  function updateCompareCourseGroupState(group) {
    if (!group) return;

    const records = Array.from(group.querySelectorAll('input[name="compare-record"]'));
    const selected = records.filter((checkbox) => checkbox.checked);
    const countEl = group.querySelector('[data-course-selection-count]');
    const selectAll = group.querySelector('[data-select-course-all]');
    const clearSelection = group.querySelector('[data-clear-course-selection]');

    if (countEl) {
      countEl.textContent = selected.length
        ? `${selected.length} selecionado${selected.length === 1 ? '' : 's'}`
        : '';
    }

    if (selectAll) {
      selectAll.disabled = records.length === 0 || selected.length === records.length;
    }
    if (clearSelection) {
      clearSelection.disabled = selected.length === 0;
    }
  }

  function updateAllCompareCourseGroups() {
    document
      .querySelectorAll('#compare-record-options .compare-course-group')
      .forEach(updateCompareCourseGroupState);
  }

  function initializeCompareCourseGroups() {
    const container = document.getElementById('compare-record-options');
    if (!container) return;

    container.querySelectorAll('.compare-course-group__header').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.closest('.compare-course-group');
        const body = group?.querySelector('.compare-course-group__body');
        if (!body) return;

        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        body.hidden = expanded;
      });
    });

    container.querySelectorAll('[data-select-course-all]').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.closest('.compare-course-group');
        group?.querySelectorAll('input[name="compare-record"]').forEach((item) => {
          item.checked = true;
        });
        updateCompareSelectionState();
      });
    });

    container.querySelectorAll('[data-clear-course-selection]').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.closest('.compare-course-group');
        group?.querySelectorAll('input[name="compare-record"]').forEach((item) => {
          item.checked = false;
        });
        updateCompareSelectionState();
      });
    });

    container.querySelectorAll('input[name="compare-record"]').forEach((checkbox) => {
      checkbox.addEventListener('change', updateCompareSelectionState);
    });

    updateAllCompareCourseGroups();
  }

  function updateCompareSelectionState() {
    const checkboxes = Array.from(
      document.querySelectorAll('input[name="compare-record"]')
    );
    const selected = checkboxes.filter((checkbox) => checkbox.checked);

    // Sem limite máximo: todos os prontuários permanecem selecionáveis.
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = false;
    });

    document.getElementById('compare-selected-count').textContent =
      `${selected.length} selecionado${selected.length === 1 ? '' : 's'}`;

    updateAllCompareCourseGroups();
    document.getElementById('btn-proceed-compare-select').disabled =
      selected.length < 2;
  }

  function closeCompareSelectionModal() {
    document.getElementById('modal-compare-select').style.display = 'none';
    document.getElementById('compare-record-options').innerHTML = '';
    document.getElementById('btn-proceed-compare-select').disabled = true;
    document.getElementById('compare-selected-count').textContent = '0 selecionados';
    pendingCompareCourseId = null;
  }

  function proceedCompareSelection() {
    const ids = Array.from(
      document.querySelectorAll('input[name="compare-record"]:checked')
    ).map((checkbox) => Number(checkbox.value));

    if (ids.length < 2) {
      notify.info('Selecione 2 ou mais prontuários para comparar.');
      return;
    }

    const records = ids
      .map((id) => patientHistory.find((record) => Number(record.id) === id))
      .filter(Boolean);

    closeCompareSelectionModal();
    openDocumentViewer(records, { comparacao: true });
  }

  function openDocumentViewer(records, options = {}) {
    const validRecords = Array.isArray(records)
      ? records.filter(Boolean)
      : [];

    if (!validRecords.length || !window.RenderizadorProntuario) {
      notify.error('Não foi possível montar a visualização do prontuário.');
      return;
    }

    const comparing = options.comparacao || validRecords.length > 1;
    const container = document.getElementById('prontuario-documento-container');
    documentViewerRecords = [...validRecords];

    document.getElementById('document-view-title').textContent =
      comparing ? 'Comparação de prontuários' : 'Visualizar prontuário';
    document.getElementById('document-view-description').textContent =
      comparing
        ? `${validRecords.length} prontuários selecionados • modo somente leitura`
        : `${formatDateTime(validRecords[0].created_at)} • modo somente leitura`;

    container.innerHTML = window.RenderizadorProntuario.renderizar(
      validRecords,
      patientData
    );

    window.IconesCAIGE?.aplicar(container);

    const modalDocumento = document.getElementById('modal-prontuario-documento');
    const corpoDocumento = modalDocumento.querySelector('.prontuario-documento-modal__body');
    if (corpoDocumento) corpoDocumento.scrollTop = 0;
    modalDocumento.style.display = 'flex';
  }

  function closeDocumentViewer() {
    document.getElementById('modal-prontuario-documento').style.display = 'none';
    document.getElementById('prontuario-documento-container').innerHTML = '';
    documentViewerRecords = [];
  }

  async function imprimirDocumentoAtual() {
    if (!documentViewerRecords.length) {
      notify.info('Abra um prontuário antes de imprimir.');
      return;
    }

    if (!window.GeradorPdfCAIGE?.exportarProntuarioClinico) {
      notify.error('Não foi possível carregar o gerador do documento.');
      return;
    }

    const botao = document.getElementById('btn-print-document');
    if (botao) botao.disabled = true;

    try {
      await window.GeradorPdfCAIGE.exportarProntuarioClinico({
        registros: documentViewerRecords,
        paciente: patientData,
        abrirParaImpressao: true
      });
      notify.success('Documento preparado para impressão.');
    } catch (error) {
      console.error('Erro ao preparar prontuário para impressão:', error);
      notify.error(error.message || 'Não foi possível gerar o prontuário para impressão.');
    } finally {
      if (botao) botao.disabled = false;
    }
  }

  async function openQuestionnaireForm(questionnaireId, questionnaireData) {
    const questionnaire = publishedQuestionnaires.find(
      (item) => Number(item.id) === Number(questionnaireId)
    );

    if (
      !questionnaire ||
      !canRegisterInCourse(questionnaire.idCurso)
    ) {
      notify.error('Você não possui permissão para lançar este prontuário.');
      return;
    }

    try {
      currentQuestionnaireId = questionnaireId;

      const questions =
        await gerenciadorQuestionarios.obterPerguntasQuestionario(
          questionnaireId
        );

      const container =
        document.getElementById('questionnaire-questions-container');

      document.getElementById('questionnaire-form-title').textContent =
        questionnaireData.title;

      document.getElementById('questionnaire-form-description').textContent =
        questionnaireData.description || '';

      if (!Array.isArray(questions) || !questions.length) {
        container.innerHTML = `
          <div class="questionnaire-empty">
            <div class="questionnaire-empty__text">
              Este prontuário não possui perguntas.
            </div>
          </div>
        `;
      } else {
        container.innerHTML = questions
          .map((question) =>
            gerenciadorQuestionarios.renderizarPergunta(question, '')
          )
          .join('');
      }

      document.getElementById('modal-questionnaire').style.display = 'flex';
    } catch (error) {
      console.error('Erro ao abrir prontuário:', error);
      notify.error(error.message || 'Erro ao carregar prontuário');
    }
  }

  function closeQuestionnaireModal() {
    document.getElementById('modal-questionnaire').style.display = 'none';
    document.getElementById('form-questionnaire').reset();
    currentQuestionnaireId = null;
  }

  function bindEvents() {
    document.getElementById('btn-close-launch-select')
      .addEventListener('click', closeLaunchSelectionModal);

    document.getElementById('btn-cancel-launch-select')
      .addEventListener('click', closeLaunchSelectionModal);

    document.getElementById('btn-proceed-launch-select')
      .addEventListener('click', proceedLaunchSelection);

    document.getElementById('launch-questionnaire-options')
      .addEventListener('change', (event) => {
        if (event.target.matches('input[name="launch-questionnaire"]')) {
          document.getElementById('btn-proceed-launch-select').disabled = false;
        }
      });

    document.getElementById('modal-launch-select')
      .addEventListener('click', (event) => {
        if (event.target === document.getElementById('modal-launch-select')) {
          closeLaunchSelectionModal();
        }
      });

    document.getElementById('btn-back-patient').addEventListener('click', () => {
      window.location.href = `./visualizar.html?id=${patientId}`;
    });

    document.getElementById('btn-close-questionnaire')
      .addEventListener('click', closeQuestionnaireModal);

    document.getElementById('btn-cancel-questionnaire')
      .addEventListener('click', closeQuestionnaireModal);

    document.getElementById('modal-questionnaire').addEventListener('click', (event) => {
      if (event.target === document.getElementById('modal-questionnaire')) {
        closeQuestionnaireModal();
      }
    });

    document.getElementById('btn-close-compare-select')
      .addEventListener('click', closeCompareSelectionModal);

    document.getElementById('btn-cancel-compare-select')
      .addEventListener('click', closeCompareSelectionModal);

    document.getElementById('btn-proceed-compare-select')
      .addEventListener('click', proceedCompareSelection);

    document.getElementById('compare-record-options')
      .addEventListener('change', (event) => {
        if (event.target.matches('input[name="compare-record"]')) {
          updateCompareSelectionState();
        }
      });

    document.getElementById('modal-compare-select').addEventListener('click', (event) => {
      if (event.target === document.getElementById('modal-compare-select')) {
        closeCompareSelectionModal();
      }
    });

    document.getElementById('btn-close-document-view')
      .addEventListener('click', closeDocumentViewer);

    document.getElementById('btn-print-document')
      .addEventListener('click', imprimirDocumentoAtual);

    document.getElementById('modal-prontuario-documento').addEventListener('click', (event) => {
      if (event.target === document.getElementById('modal-prontuario-documento')) {
        closeDocumentViewer();
      }
    });

    document.getElementById('form-questionnaire').addEventListener(
      'submit',
      async (event) => {
        event.preventDefault();

        if (!currentQuestionnaireId) {
          return;
        }

        const submitButton =
          document.getElementById('btn-submit-questionnaire');

        try {
          const responses =
            gerenciadorQuestionarios.coletarRespostas(event.target);

          submitButton.disabled = true;
          submitButton.textContent = 'Enviando...';

          await gerenciadorQuestionarios.salvarRespostas(
            currentQuestionnaireId,
            responses
          );

          const savedQuestionnaire = publishedQuestionnaires.find(
            (item) => Number(item.id) === Number(currentQuestionnaireId)
          );

          if (savedQuestionnaire?.idCurso) {
            preferredOpenCourseId = Number(savedQuestionnaire.idCurso);
          }

          notify.success('Lançamento salvo com sucesso');
          closeQuestionnaireModal();
          await refreshClinicalTimeline();
        } catch (error) {
          console.error('Erro ao salvar respostas:', error);
          notify.error(error.message || 'Erro ao salvar prontuário');
        } finally {
          submitButton.disabled = false;
          submitButton.textContent = 'Salvar lançamento';
        }
      }
    );
  }

  async function init() {
    if (
      window.UtilJWT &&
      !window.UtilJWT.exigirSessao()
    ) {
      return;
    }

    bindEvents();

    try {
      const [patient] = await Promise.all([
        loadPatient(),
        loadProfile(),
        loadCourses()
      ]);

      if (!patient) {
        return;
      }

      populatePatientHeader(patient);
      renderizarResumoClinico(patient);
      restaurarEstadoAcordeoes();
      await initializeQuestionnaires();
    } catch (error) {
      console.error('Erro ao carregar prontuário:', error);
      notify.error(
        error.message ||
        'Erro ao carregar prontuário do paciente'
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
