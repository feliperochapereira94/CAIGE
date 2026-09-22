/**
 * Gerenciador de questionarios para pagina de visualizacao de paciente
 * Gerencia interacao com prontuarios integrados na pagina
 */

class GerenciadorQuestionarios {
  constructor() {
    this.API_BASE_URL = '/api/questionarios';
    this.currentPatient = null;
    this.currentQuestionnaire = null;
  }

  /**
   * Inicializar handler com dados do paciente
   */
  async inicializar(patientData) {
    this.currentPatient = patientData;
  }

  /**
   * Listar prontuários publicados para consulta clínica.
   * A leitura é interdisciplinar; o backend controla o lançamento.
   */
  async listarQuestionariosPublicados(courseId = null) {
    const params = new URLSearchParams();

    if (courseId) {
      params.set('idCurso', String(courseId));
    }

    const suffix = params.toString()
      ? `?${params.toString()}`
      : '';

    const response = await fetch(
      `${this.API_BASE_URL}/questionarios/publicados${suffix}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message ||
        'Erro ao carregar prontuários publicados'
      );
    }

    return await response.json();
  }

  /**
   * Obter todos os lançamentos do paciente, independentemente do curso.
   */
  async obterHistoricoPaciente() {
    if (!this.currentPatient?.id) {
      return [];
    }

    const response = await fetch(
      `${this.API_BASE_URL}/respostas/paciente/${this.currentPatient.id}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message ||
        'Erro ao carregar histórico do paciente'
      );
    }

    return await response.json();
  }

  /**
  * Listar prontuários disponíveis para um curso
   */
  async listarQuestionariosDisponiveis(course) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/questionarios/curso/${encodeURIComponent(course)}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar prontuários');
      }

      const questionnaires = await response.json();
      // Retornar apenas prontuários publicados
      return questionnaires.filter(q => q.is_published);
    } catch (error) {
      console.error('Erro ao listar prontuários:', error);
      return [];
    }
  }

  /**
  * Obter perguntas de um prontuário
   */
  async obterPerguntasQuestionario(questionnaireId) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/questionarios/${questionnaireId}/perguntas`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const msg = `Erro ao carregar perguntas (${response.status})`;
        throw new Error(msg);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao listar perguntas:', error);
      throw error;
    }
  }

  /**
  * Salvar respostas de um prontuário
   */
  async salvarRespostas(questionnaireId, responses) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/respostas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: this.currentPatient.id,
          questionnaireId: questionnaireId,
          responses: responses
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao salvar respostas');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao salvar respostas:', error);
      throw error;
    }
  }

  /**
  * Obter histórico de respostas anteriores
   */
  async obterRespostasAnteriores(questionnaireId) {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/respostas/${this.currentPatient.id}/${questionnaireId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar histórico');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao listar histórico:', error);
      return [];
    }
  }

  /**
   * Renderizar pergunta com base em seu tipo
   */
  renderizarPergunta(question, responseValue = '') {
    const questionId = question.id;
    const layout = question.layout || question.disposicao || 'automatico';
    const isWide = layout === 'linha_inteira' ||
      (layout === 'automatico' && question.question_type === 'texto_livre');
    let html = `
      <div class="questionnaire-question ${isWide ? 'questionnaire-question--wide' : ''}" data-question-id="${questionId}">
        <label class="questionnaire-question__label">
          <span class="questionnaire-question__title">${this.escaparHtml(question.title)}</span>
          ${question.description ? `<p class="questionnaire-question__description">${this.escaparHtml(question.description)}</p>` : ''}
        </label>
    `;

    switch (question.question_type) {
      case 'texto_livre':
        html += `<textarea 
          class="questionnaire-question__input" 
          name="question_${questionId}"
          placeholder="Digite sua resposta..."
          rows="2"
        >${this.escaparHtml(responseValue)}</textarea>`;
        break;

      case 'multipla_escolha': {
        const rawOpts = question.options;
        let options = [];
        if (rawOpts) {
          if (typeof rawOpts === 'string') {
            try { options = JSON.parse(rawOpts).options || []; } catch (e) { options = []; }
          } else if (Array.isArray(rawOpts)) {
            options = rawOpts;
          } else {
            options = rawOpts.options || [];
          }
        }
        html += `<div class="questionnaire-question__options">`;
        options.forEach(option => {
          const isSelected = responseValue === option;
          html += `
            <label class="questionnaire-question__option">
              <input type="radio" name="question_${questionId}" value="${this.escaparHtml(option)}" ${isSelected ? 'checked' : ''}>
              <span>${this.escaparHtml(option)}</span>
            </label>
          `;
        });
        html += `</div>`;
        break;
      }

      case 'sim_nao':
        const simSelected = responseValue === 'Sim';
        const naoSelected = responseValue === 'Não';
        html += `
          <div class="questionnaire-question__options">
            <label class="questionnaire-question__option">
              <input type="radio" name="question_${questionId}" value="Sim" ${simSelected ? 'checked' : ''}>
              <span>Sim</span>
            </label>
            <label class="questionnaire-question__option">
              <input type="radio" name="question_${questionId}" value="Não" ${naoSelected ? 'checked' : ''}>
              <span>Não</span>
            </label>
          </div>
        `;
        break;

      case 'escala':
        html += `<div class="questionnaire-question__scale">`;
        for (let i = 1; i <= 5; i++) {
          const isSelected = parseInt(responseValue) === i;
          html += `
            <label class="questionnaire-question__scale-item">
              <input type="radio" name="question_${questionId}" value="${i}" ${isSelected ? 'checked' : ''}>
              <span>${i}</span>
            </label>
          `;
        }
        html += `</div>`;
        break;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Escapar HTML para prevenir XSS
   */
  escaparHtml(text) {
    const value = String(text ?? '');
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return value.replace(/[&<>"']/g, m => map[m]);
  }

  /**
  * Coletar respostas do formulário
   */
  coletarRespostas(formElement) {
    const responses = {};
    const formData = new FormData(formElement);

    for (const [key, value] of formData.entries()) {
      const questionId = key.replace('question_', '');
      responses[questionId] = value;
    }

    return responses;
  }
}

// Exportar para uso global
window.GerenciadorQuestionarios = GerenciadorQuestionarios;


