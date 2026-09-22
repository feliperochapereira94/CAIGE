(function () {
  function formatResidentialPhone(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  function formatMobilePhone(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function isValidResidentialPhone(value) {
    return /^\(\d{2}\)\s\d{4}-\d{4}$/.test(String(value || ''));
  }

  function isValidMobilePhone(value) {
    return /^\(\d{2}\)\s\d{5}-\d{4}$/.test(String(value || ''));
  }

  function formatCPF(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  function formatCEP(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (!digits) return '';
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  function convertBrDateToDb(dateStr) {
    if (!dateStr) return '';
    const isoMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return dateStr;
    }
    const parts = String(dateStr).split('/');
    if (parts.length !== 3) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  function validateContactFields(formData) {
    if (!formData.phone && !formData.phone2) {
      return 'Informe ao menos Telefone residencial ou Celular';
    }

    if (formData.phone && !isValidResidentialPhone(formData.phone)) {
      return 'Telefone residencial inválido. Use (00) 0000-0000';
    }

    if (formData.phone2 && !isValidMobilePhone(formData.phone2)) {
      return 'Celular inválido. Use (00) 00000-0000';
    }

    return null;
  }

  function normalizePatientTextFields(formData) {
    const formatarNome = (v) => window.FormatadorTexto?.formatarNomePessoa?.(v) ?? String(v ?? '').trim();
    const formatarEnd = (v) => window.FormatadorTexto?.formatarTitulo?.(v) ?? String(v ?? '').trim();
    const formatarEstado = (v) => window.FormatadorTexto?.formatarEstado?.(v) ?? String(v ?? '').trim().toLocaleUpperCase('pt-BR');
    const trimOuNull = (v) => {
      const s = String(v ?? '').trim();
      return s || null;
    };

    return {
      ...formData,
      name: formatarNome(formData.name),
      street: formatarEnd(formData.street),
      neighborhood: formatarEnd(formData.neighborhood),
      city: formatarEnd(formData.city),
      state: formatarEstado(formData.state),
      responsible: formatarNome(formData.responsible),
      observations: trimOuNull(formData.observations),
      health_conditions: trimOuNull(formData.health_conditions),
      allergies: trimOuNull(formData.allergies),
      medications_in_use: trimOuNull(formData.medications_in_use),
      clinical_observations: trimOuNull(formData.clinical_observations)
    };
  }

  function separarListaClinica(valor) {
    const texto = String(valor || '').trim();
    if (!texto) return [];

    let itens = texto.split(/\r?\n|;/);
    if (itens.length === 1 && texto.includes(',')) {
      itens = texto.split(',');
    }

    return [...new Set(itens.map((item) => item.trim()).filter(Boolean))];
  }

  function serializarListaClinica(itens) {
    return [...new Set(
      (itens || []).map((item) => String(item || '').trim()).filter(Boolean)
    )].join('\n');
  }

  function criarEditorListaClinica(configuracao) {
    const campo = document.getElementById(configuracao.campoId);
    const entrada = document.getElementById(configuracao.entradaId);
    const lista = document.getElementById(configuracao.listaId);
    const botaoAdicionar = document.getElementById(configuracao.botaoId);
    const editorContainer = entrada ? entrada.closest('.editor-lista-clinica') : null;

    if (!campo || !entrada || !lista || !botaoAdicionar) return null;

    let itens = [];
    let desabilitado = false;
    const ouvintesMudanca = [];

    function dispararMudanca() {
      ouvintesMudanca.forEach((cb) => {
        try {
          cb([...itens]);
        } catch (e) {
          console.error(e);
        }
      });
    }

    function renderizar() {
      lista.innerHTML = '';
      campo.value = serializarListaClinica(itens);

      if (itens.length === 0) {
        const vazio = document.createElement('span');
        vazio.className = 'editor-lista-clinica__vazio';
        vazio.textContent = configuracao.textoVazio;
        lista.appendChild(vazio);
        return;
      }

      itens.forEach((item, indice) => {
        const elemento = document.createElement('span');
        elemento.className = 'editor-lista-clinica__item';
        if (configuracao.perigo) elemento.classList.add('editor-lista-clinica__item--perigo');
        if (configuracao.lista) elemento.classList.add('editor-lista-clinica__item--linha');

        const texto = document.createElement('span');
        texto.textContent = item;

        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'editor-lista-clinica__remover';
        remover.setAttribute('aria-label', `Remover ${item}`);
        remover.innerHTML = '<span class="icone icone--xs" data-icone="fechar" aria-hidden="true"></span>';
        window.IconesCAIGE?.aplicar?.(remover);
        if (desabilitado) {
          remover.disabled = true;
        }
        remover.addEventListener('click', () => {
          if (desabilitado) return;
          itens.splice(indice, 1);
          renderizar();
          dispararMudanca();
        });

        elemento.append(texto, remover);
        lista.appendChild(elemento);
      });
    }

    function adicionar() {
      if (desabilitado) return;
      const valor = entrada.value.trim();
      if (!valor) return;

      const repetido = itens.some(
        (item) => item.toLocaleLowerCase('pt-BR') === valor.toLocaleLowerCase('pt-BR')
      );
      if (!repetido) {
        itens.push(valor);
        entrada.value = '';
        renderizar();
        dispararMudanca();
      } else {
        entrada.value = '';
      }
      entrada.focus();
    }

    botaoAdicionar.addEventListener('click', adicionar);
    entrada.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Enter') return;
      evento.preventDefault();
      adicionar();
    });

    return {
      configuracao,
      definirValor(valor) {
        itens = separarListaClinica(valor);
        renderizar();
        dispararMudanca();
      },
      obterItens() {
        return [...itens];
      },
      limparItens() {
        itens = [];
        renderizar();
        dispararMudanca();
      },
      definirDesabilitado(bloquear) {
        desabilitado = Boolean(bloquear);
        entrada.disabled = desabilitado;
        botaoAdicionar.disabled = desabilitado;
        if (editorContainer) {
          editorContainer.classList.toggle('is-disabled', desabilitado);
        }
        renderizar();
      },
      estaDesabilitado() {
        return desabilitado;
      },
      aoMudar(callback) {
        if (typeof callback === 'function') {
          ouvintesMudanca.push(callback);
        }
      }
    };
  }

  function inicializarEditoresClinicosPaciente() {
    const configuracoes = [
      ['condicoesSaude', 'health-conditions', 'condicoes-saude-entrada', 'condicoes-saude-lista', 'condicoes-saude-adicionar', 'Nenhuma condição informada.'],
      ['alergias', 'allergies', 'alergias-entrada', 'alergias-lista', 'alergias-adicionar', 'Nenhuma alergia informada.', true],
      ['medicamentos', 'medications', 'medicamentos-entrada', 'medicamentos-lista', 'medicamentos-adicionar', 'Nenhum medicamento informado.', false, true]
    ];

    return configuracoes.reduce((editores, configuracao) => {
      const [chave, campoId, entradaId, listaId, botaoId, textoVazio, perigo, lista] = configuracao;
      const editor = criarEditorListaClinica({ campoId, entradaId, listaId, botaoId, textoVazio, perigo, lista });
      if (editor) editores[chave] = editor;
      return editores;
    }, {});
  }

  function configurarControlesClinicosSemOcorrencia(editoresClinicos, opcoes = {}) {
    const atalhoEl = document.getElementById(opcoes.atalhoId || 'shortcut-no-clinical-records');
    const chkCondicoes = document.getElementById(opcoes.condicoesId || 'nenhuma-condicao');
    const chkAlergias = document.getElementById(opcoes.alergiasId || 'nenhuma-alergia');
    const chkMedicamentos = document.getElementById(opcoes.medicamentosId || 'nenhum-medicamento');

    const categorias = [
      {
        chk: chkCondicoes,
        editor: editoresClinicos.condicoesSaude,
        nome: 'condições de saúde'
      },
      {
        chk: chkAlergias,
        editor: editoresClinicos.alergias,
        nome: 'alergias'
      },
      {
        chk: chkMedicamentos,
        editor: editoresClinicos.medicamentos,
        nome: 'medicamentos em uso'
      }
    ];

    function atualizarSincronizacaoAtalho() {
      if (!atalhoEl) return;
      const todasNegativas = categorias.every((c) => c.chk && c.chk.checked);
      atalhoEl.checked = todasNegativas;
    }

    categorias.forEach(({ chk, editor, nome }) => {
      if (!chk || !editor) return;

      chk.addEventListener('change', async function () {
        if (this.checked) {
          const itens = typeof editor.obterItens === 'function' ? editor.obterItens() : [];
          if (itens.length > 0) {
            let confirmar = false;
            if (window.ModalConfirmacao && typeof window.ModalConfirmacao.confirmar === 'function') {
              confirmar = await window.ModalConfirmacao.confirmar({
                titulo: 'Confirmar remoção de itens',
                mensagem: `Já existem ${nome} cadastradas. Deseja removê-las para confirmar que não há ocorrências?`,
                variante: 'aviso',
                textoConfirmar: 'Remover e confirmar',
                textoCancelar: 'Cancelar',
                icone: 'alerta'
              });
            }
            if (!confirmar) {
              this.checked = false;
              atualizarSincronizacaoAtalho();
              return;
            }
            if (typeof editor.limparItens === 'function') {
              editor.limparItens();
            }
          }
          if (typeof editor.definirDesabilitado === 'function') {
            editor.definirDesabilitado(true);
          }
          limparErroCampo(chk);
          const campoEntrada = document.getElementById(editor.configuracao?.entradaId);
          if (campoEntrada) limparErroCampo(campoEntrada);
        } else {
          if (typeof editor.definirDesabilitado === 'function') {
            editor.definirDesabilitado(false);
          }
        }
        atualizarSincronizacaoAtalho();
      });

      if (typeof editor.aoMudar === 'function') {
        editor.aoMudar(() => {
          // Se adicionar item, desmarca a opção negativa e o atalho
          const itens = editor.obterItens();
          if (itens.length > 0 && chk.checked) {
            chk.checked = false;
            editor.definirDesabilitado(false);
            atualizarSincronizacaoAtalho();
          }
        });
      }
    });

    if (atalhoEl) {
      atalhoEl.addEventListener('change', async function () {
        if (this.checked) {
          const temAlgumItem = categorias.some(
            (c) => c.editor && typeof c.editor.obterItens === 'function' && c.editor.obterItens().length > 0
          );
          if (temAlgumItem) {
            let confirmar = false;
            if (window.ModalConfirmacao && typeof window.ModalConfirmacao.confirmar === 'function') {
              confirmar = await window.ModalConfirmacao.confirmar({
                titulo: 'Confirmar remoção de itens clínicos',
                mensagem: 'Existem itens clínicos cadastrados. Deseja removê-los para confirmar que o paciente não possui nenhuma condição, alergia ou medicamento em uso?',
                variante: 'aviso',
                textoConfirmar: 'Remover e confirmar',
                textoCancelar: 'Cancelar',
                icone: 'alerta'
              });
            }
            if (!confirmar) {
              this.checked = false;
              return;
            }
          }

          categorias.forEach(({ chk, editor }) => {
            if (editor && typeof editor.limparItens === 'function') {
              editor.limparItens();
            }
            if (chk) {
              chk.checked = true;
              limparErroCampo(chk);
            }
            if (editor && typeof editor.definirDesabilitado === 'function') {
              editor.definirDesabilitado(true);
            }
            const campoEntrada = document.getElementById(editor.configuracao?.entradaId);
            if (campoEntrada) limparErroCampo(campoEntrada);
          });
        } else {
          categorias.forEach(({ chk, editor }) => {
            if (chk) chk.checked = false;
            if (editor && typeof editor.definirDesabilitado === 'function') {
              editor.definirDesabilitado(false);
            }
          });
        }
      });
    }

    return {
      atualizarSincronizacaoAtalho,
      aplicarEstadoInicial({ condicoesAvaliadas, semCondicoes, alergiasAvaliadas, semAlergias, medicamentosAvaliados, semMedicamentos }) {
        if (chkCondicoes) {
          chkCondicoes.checked = Boolean(semCondicoes);
          editoresClinicos.condicoesSaude?.definirDesabilitado(Boolean(semCondicoes));
        }
        if (chkAlergias) {
          chkAlergias.checked = Boolean(semAlergias);
          editoresClinicos.alergias?.definirDesabilitado(Boolean(semAlergias));
        }
        if (chkMedicamentos) {
          chkMedicamentos.checked = Boolean(semMedicamentos);
          editoresClinicos.medicamentos?.definirDesabilitado(Boolean(semMedicamentos));
        }
        atualizarSincronizacaoAtalho();
      }
    };
  }

  async function fetchViaCep(cep) {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    return response.json();
  }

  function attachPhoneMasks(options = {}) {
    const residential = document.getElementById(options.residentialId || 'phone1');
    const mobile = document.getElementById(options.mobileId || 'phone2');
    const responsible = document.getElementById(options.responsibleId || 'responsible-phone');

    const bindMask = (element, formatter) => {
      if (!element) return;
      element.addEventListener('input', function () {
        const digits = String(this.value || '').replace(/\D/g, '');
        this.value = digits ? formatter(digits) : '';
      });
      element.addEventListener('blur', function () {
        if (!String(this.value || '').replace(/\D/g, '')) this.value = '';
      });
    };

    bindMask(residential, formatResidentialPhone);
    bindMask(mobile, formatMobilePhone);
    bindMask(responsible, formatMobilePhone);
  }

  function attachCpfMask(options = {}) {
    const cpfInput = document.getElementById(options.cpfId || 'cpf');
    if (!cpfInput) return;

    cpfInput.addEventListener('input', function () {
      const digits = String(this.value || '').replace(/\D/g, '');
      this.value = digits ? formatCPF(digits) : '';
    });
    cpfInput.addEventListener('blur', function () {
      if (!String(this.value || '').replace(/\D/g, '')) this.value = '';
    });
  }

  function attachCepAutoFill(options = {}) {
    const cepInput = document.getElementById(options.cepId || 'cep');
    const streetInput = document.getElementById(options.streetId || 'street');
    const neighborhoodInput = document.getElementById(options.neighborhoodId || 'neighborhood');
    const cityInput = document.getElementById(options.cityId || 'city');
    const stateInput = document.getElementById(options.stateId || 'state');

    if (!cepInput) return;

    cepInput.addEventListener('input', async function () {
      const cepDigits = String(this.value || '').replace(/\D/g, '');
      this.value = cepDigits ? formatCEP(cepDigits) : '';
      const cepClean = this.value.replace(/\D/g, '');

      if (cepClean.length !== 8) return;

      try {
        const data = await fetchViaCep(cepClean);

        if (data.erro) {
          if (typeof options.onNotFound === 'function') {
            options.onNotFound();
          }
          return;
        }

        if (streetInput) streetInput.value = data.logradouro || '';
        if (neighborhoodInput) neighborhoodInput.value = data.bairro || '';
        if (cityInput) cityInput.value = data.localidade || '';
        if (stateInput) stateInput.value = data.uf || '';

        if (typeof options.onFilled === 'function') {
          options.onFilled();
        }
      } catch (error) {
        if (typeof options.onError === 'function') {
          options.onError(error);
        }
      }
    });
  }

  function validarAlturaCm(valor) {
    if (valor === null || valor === undefined || valor === '') {
      return { valido: false, mensagem: 'Informe a altura em cm.' };
    }
    const str = String(valor).trim().replace(',', '.');
    const num = Number(str);
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      return {
        valido: false,
        mensagem: 'Informe a altura em centímetros (apenas números inteiros de até 3 dígitos, ex.: 165).'
      };
    }
    if (num < 30 || num > 250) {
      return {
        valido: false,
        mensagem: 'Altura fora da faixa plausível (deve estar entre 30 e 250 cm).'
      };
    }
    return { valido: true, valor: num };
  }

  function normalizarAlturaCm(valor) {
    const res = validarAlturaCm(valor);
    return res.valido ? res.valor : null;
  }

  function vincularRestricaoAltura(alturaInput) {
    if (!alturaInput) return;
    alturaInput.addEventListener('input', function () {
      const sanitizado = this.value.replace(/\D/g, '').slice(0, 3);
      if (this.value !== sanitizado) {
        this.value = sanitizado;
      }
    });
  }

  function normalizarPesoKg(valor) {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }
    const str = String(valor).trim().replace(',', '.');
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0) {
      return null;
    }
    return num;
  }

  function validarPesoKg(valor) {
    if (valor === null || valor === undefined || valor === '') {
      return { valido: false, mensagem: 'Informe o peso atual em kg.' };
    }
    const str = String(valor).trim();
    if (!/^\d+([.,]\d+)?$/.test(str)) {
      return { valido: false, mensagem: 'Informe um peso válido (ex.: 70 ou 72,5).' };
    }
    const num = Number(str.replace(',', '.'));
    if (!Number.isFinite(num) || num < 1 || num > 500) {
      return { valido: false, mensagem: 'Peso fora da faixa plausível (entre 1 e 500 kg).' };
    }
    return { valido: true, valor: num };
  }

  function validarCpf(valor) {
    if (valor === null || valor === undefined || valor === '') {
      return { valido: false, mensagem: 'Informe o CPF ou Documento.' };
    }
    const str = String(valor).trim();
    const digits = str.replace(/\D/g, '');
    if (digits.length > 0 && digits.length !== 11 && !str.includes('/')) {
      return { valido: false, mensagem: 'CPF inválido. Use o formato 000.000.000-00.' };
    }
    if (str.length < 3) {
      return { valido: false, mensagem: 'Documento inválido.' };
    }
    return { valido: true, valor: str };
  }

  function validarCep(valor) {
    if (valor === null || valor === undefined || valor === '') {
      return { valido: false, mensagem: 'Informe o CEP.' };
    }
    const str = String(valor).trim();
    const digits = str.replace(/\D/g, '');
    if (digits.length !== 8) {
      return { valido: false, mensagem: 'CEP inválido. Use o padrão 00000-000.' };
    }
    return { valido: true, valor: str };
  }

  function parseDateParts(dateInput) {
    if (!dateInput) return null;
    if (typeof dateInput === 'string') {
      const clean = dateInput.trim();
      const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return {
          year: parseInt(isoMatch[1], 10),
          month: parseInt(isoMatch[2], 10),
          day: parseInt(isoMatch[3], 10)
        };
      }
      const brMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (brMatch) {
        return {
          year: parseInt(brMatch[3], 10),
          month: parseInt(brMatch[2], 10),
          day: parseInt(brMatch[1], 10)
        };
      }
    }
    if (dateInput && typeof dateInput.getTime === 'function' && !Number.isNaN(dateInput.getTime())) {
      return {
        year: dateInput.getFullYear(),
        month: dateInput.getMonth() + 1,
        day: dateInput.getDate()
      };
    }
    if (typeof dateInput === 'object' && dateInput !== null) {
      const y = Number(dateInput.year);
      const m = Number(dateInput.month);
      const d = Number(dateInput.day);
      if (Number.isInteger(y) && Number.isInteger(m) && Number.isInteger(d)) {
        return { year: y, month: m, day: d };
      }
    }
    return null;
  }

  function calcularIdade(dataNascimento, dataReferencia = new Date()) {
    const birthParts = parseDateParts(dataNascimento);
    const refParts = parseDateParts(dataReferencia);
    if (!birthParts || !refParts) return null;

    let age = refParts.year - birthParts.year;
    const monthDiff = refParts.month - birthParts.month;
    if (monthDiff < 0 || (monthDiff === 0 && refParts.day < birthParts.day)) {
      age--;
    }
    if (age < 0 || age > 150) return null;
    return age;
  }

  function calcularIMC(pesoKg, alturaCm) {
    const resPeso = validarPesoKg(pesoKg);
    const resAltura = validarAlturaCm(alturaCm);

    if (!resPeso.valido || !resAltura.valido) {
      return null;
    }

    const alturaMetros = resAltura.valor / 100;
    return resPeso.valor / (alturaMetros * alturaMetros);
  }

  function classificarIMC(imc, contexto) {
    if (!Number.isFinite(imc) || imc <= 0) {
      return null;
    }

    let idade = null;
    if (typeof contexto === 'number' && Number.isFinite(contexto)) {
      idade = contexto;
    } else if (contexto && typeof contexto === 'object') {
      if (typeof contexto.idade === 'number' && Number.isFinite(contexto.idade)) {
        idade = contexto.idade;
      } else if (contexto.dataNascimento) {
        idade = calcularIdade(contexto.dataNascimento, contexto.dataReferencia);
      } else if (typeof contexto.getTime === 'function') {
        idade = calcularIdade(contexto);
      } else if (Number.isInteger(Number(contexto.year)) && Number.isInteger(Number(contexto.month))) {
        idade = calcularIdade(contexto);
      }
    } else if (typeof contexto === 'string') {
      const trimmed = contexto.trim();
      if (/^\d{1,3}$/.test(trimmed)) {
        idade = parseInt(trimmed, 10);
      } else {
        idade = calcularIdade(trimmed);
      }
    }

    if (idade === null || !Number.isFinite(idade) || idade < 0 || idade > 150) {
      return null;
    }

    // Idosos (>= 60 anos)
    if (idade >= 60) {
      if (imc < 22.0) {
        return {
          rotulo: 'Baixo peso',
          classificacao: 'Baixo peso',
          classe: 'status-pill--warning',
          faixaEtaria: 'idoso'
        };
      }
      if (imc < 27.0) {
        return {
          rotulo: 'Peso adequado (Eutrófico)',
          classificacao: 'Peso adequado (Eutrófico)',
          classe: 'status-pill--success',
          faixaEtaria: 'idoso'
        };
      }
      return {
        rotulo: 'Sobrepeso',
        classificacao: 'Sobrepeso',
        classe: 'status-pill--warning',
        faixaEtaria: 'idoso'
      };
    }

    // Adultos (< 60 anos)
    if (imc < 18.5) {
      return {
        rotulo: 'Abaixo do peso',
        classificacao: 'Abaixo do peso',
        classe: 'status-pill--warning',
        faixaEtaria: 'adulto'
      };
    }
    if (imc < 25.0) {
      return {
        rotulo: 'Peso normal',
        classificacao: 'Peso normal',
        classe: 'status-pill--success',
        faixaEtaria: 'adulto'
      };
    }
    if (imc < 30.0) {
      return {
        rotulo: 'Sobrepeso',
        classificacao: 'Sobrepeso',
        classe: 'status-pill--warning',
        faixaEtaria: 'adulto'
      };
    }
    if (imc < 35.0) {
      return {
        rotulo: 'Obesidade Grau I',
        classificacao: 'Obesidade Grau I',
        classe: 'status-pill--danger',
        faixaEtaria: 'adulto'
      };
    }
    if (imc < 40.0) {
      return {
        rotulo: 'Obesidade Grau II',
        classificacao: 'Obesidade Grau II',
        classe: 'status-pill--danger',
        faixaEtaria: 'adulto'
      };
    }
    return {
      rotulo: 'Obesidade Grau III',
      classificacao: 'Obesidade Grau III',
      classe: 'status-pill--danger',
      faixaEtaria: 'adulto'
    };
  }

  function atualizarExibicaoIMC(opcoes = {}) {
    const pesoInput = document.getElementById(opcoes.pesoId || 'peso-kg');
    const alturaInput = document.getElementById(opcoes.alturaId || 'altura-cm');
    const valorEl = document.getElementById(opcoes.valorId || 'imc-valor');
    const classificacaoEl =
      document.getElementById(opcoes.classificacaoId || 'imc-badge') ||
      document.getElementById('imc-classificacao');

    if (!valorEl || !classificacaoEl) return null;

    const peso = pesoInput ? pesoInput.value : null;
    const altura = alturaInput ? alturaInput.value : null;
    const imc = calcularIMC(peso, altura);

    if (imc === null) {
      valorEl.textContent = '—';
      classificacaoEl.className = 'imc-campo__classificacao status-pill';
      classificacaoEl.textContent = 'Informe peso e altura';
      return null;
    }

    valorEl.textContent = `${imc.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} kg/m²`;

    let contextoIdade = null;
    if (opcoes.idade !== undefined && opcoes.idade !== null) {
      contextoIdade = opcoes.idade;
    } else if (opcoes.dataNascimento) {
      contextoIdade = opcoes.dataNascimento;
    } else {
      const ageInput = document.getElementById(opcoes.idadeId || 'age');
      if (ageInput && ageInput.value !== '') {
        const val = Number(ageInput.value);
        if (Number.isFinite(val)) contextoIdade = val;
      }
      if (contextoIdade === null) {
        const birthInput = document.getElementById(opcoes.nascimentoId || 'birth-date');
        if (birthInput && birthInput.value) {
          contextoIdade = birthInput.value;
        }
      }
    }

    const classificacao = classificarIMC(imc, contextoIdade);

    if (classificacao) {
      classificacaoEl.className = `imc-campo__classificacao status-pill ${classificacao.classe}`;
      classificacaoEl.textContent = classificacao.rotulo;
    } else {
      classificacaoEl.className = 'imc-campo__classificacao status-pill';
      classificacaoEl.textContent = 'Informe a data de nascimento';
    }

    return imc;
  }

  function vincularCalculoIMC(opcoes = {}) {
    const pesoInput = document.getElementById(opcoes.pesoId || 'peso-kg');
    const alturaInput = document.getElementById(opcoes.alturaId || 'altura-cm');
    const ageInput = document.getElementById(opcoes.idadeId || 'age');
    const birthInput = document.getElementById(opcoes.nascimentoId || 'birth-date');

    const disparar = () => atualizarExibicaoIMC(opcoes);

    if (pesoInput) {
      pesoInput.addEventListener('input', disparar);
      pesoInput.addEventListener('change', disparar);
      pesoInput.addEventListener('keyup', disparar);
    }

    if (alturaInput) {
      alturaInput.addEventListener('input', disparar);
      alturaInput.addEventListener('change', disparar);
      alturaInput.addEventListener('keyup', disparar);
    }

    if (ageInput) {
      ageInput.addEventListener('input', disparar);
      ageInput.addEventListener('change', disparar);
    }

    if (birthInput) {
      birthInput.addEventListener('input', disparar);
      birthInput.addEventListener('change', disparar);
      birthInput.addEventListener('blur', disparar);
    }

    disparar();
    return disparar;
  }

  function marcarErroCampo(elemento, mensagem) {
    if (!elemento) return;

    elemento.classList.add('is-invalid');
    elemento.setAttribute('aria-invalid', 'true');

    const editorClinico = elemento.closest('.editor-lista-clinica');
    if (editorClinico) {
      editorClinico.classList.add('is-invalid');
    }

    const formGroup = elemento.closest('.form-group') || elemento.parentElement;
    if (!formGroup) return;

    const campoId = elemento.id || 'campo';
    const erroId = `${campoId}-error`;
    let erroEl =
      formGroup.querySelector(`.form-error[data-para="${campoId}"]`) ||
      formGroup.querySelector('.form-error');

    if (!erroEl) {
      erroEl = document.createElement('small');
      erroEl.className = 'form-error';
      erroEl.id = erroId;
      erroEl.setAttribute('role', 'alert');
      erroEl.setAttribute('data-para', campoId);
      formGroup.appendChild(erroEl);
    }

    erroEl.textContent = mensagem || 'Este campo é obrigatório.';
    elemento.setAttribute('aria-describedby', erroEl.id);

    const limpar = () => {
      limparErroCampo(elemento);
      elemento.removeEventListener('input', limpar);
      elemento.removeEventListener('change', limpar);
    };
    elemento.addEventListener('input', limpar);
    elemento.addEventListener('change', limpar);
  }

  function limparErroCampo(elemento) {
    if (!elemento) return;

    elemento.classList.remove('is-invalid');
    elemento.removeAttribute('aria-invalid');

    const editorClinico = elemento.closest('.editor-lista-clinica');
    if (editorClinico) {
      editorClinico.classList.remove('is-invalid');
    }

    const formGroup = elemento.closest('.form-group') || elemento.parentElement;
    if (!formGroup) return;

    const campoId = elemento.id || 'campo';
    const erroEl =
      formGroup.querySelector(`.form-error[data-para="${campoId}"]`) ||
      formGroup.querySelector('.form-error');

    if (erroEl) {
      erroEl.remove();
    }

    if (elemento.getAttribute('aria-describedby')?.endsWith('-error')) {
      elemento.removeAttribute('aria-describedby');
    }
  }

  function limparTodosErros(formulario) {
    if (!formulario) return;

    formulario.querySelectorAll('.is-invalid, [aria-invalid="true"]').forEach((el) => {
      el.classList.remove('is-invalid');
      el.removeAttribute('aria-invalid');
    });

    formulario.querySelectorAll('.form-error').forEach((el) => el.remove());
  }

  function validarEExibirErrosFormulario(formulario, formData) {
    if (!formulario) return { valido: false };
    limparTodosErros(formulario);

    const erros = [];

    // Nome completo
    const nameEl = document.getElementById('full-name');
    if (!formData.name) {
      erros.push({ el: nameEl, msg: 'Informe o nome completo.' });
    }

    // Data de nascimento
    const birthDateEl = document.getElementById('birth-date');
    if (!formData.birth_date || !birthDateEl?.value) {
      erros.push({ el: birthDateEl, msg: 'Informe a data de nascimento.' });
    }

    // Sexo (OBRIGATÓRIO)
    const genderEl = document.getElementById('gender');
    if (!formData.gender) {
      erros.push({ el: genderEl, msg: 'Selecione o sexo.' });
    }

    // CPF ou Documento (OBRIGATÓRIO)
    const cpfEl = document.getElementById('cpf');
    const resCpf = validarCpf(formData.cpf);
    if (!resCpf.valido) {
      erros.push({ el: cpfEl, msg: resCpf.mensagem });
    }

    // Contato (ao menos residencial ou celular)
    const phone1El = document.getElementById('phone1');
    const phone2El = document.getElementById('phone2');
    if (!formData.phone && !formData.phone2) {
      erros.push({ el: phone1El, msg: 'Informe ao menos Telefone residencial ou Celular.' });
      erros.push({ el: phone2El, msg: '' });
    } else {
      if (formData.phone && !isValidResidentialPhone(formData.phone)) {
        erros.push({ el: phone1El, msg: 'Telefone residencial inválido. Use (00) 0000-0000.' });
      }
      if (formData.phone2 && !isValidMobilePhone(formData.phone2)) {
        erros.push({ el: phone2El, msg: 'Celular inválido. Use (00) 00000-0000.' });
      }
    }

    // CEP (OBRIGATÓRIO)
    const cepEl = document.getElementById('cep');
    const resCep = validarCep(formData.cep);
    if (!resCep.valido) {
      erros.push({ el: cepEl, msg: resCep.mensagem });
    }

    // Endereço
    const streetEl = document.getElementById('street');
    if (!formData.street) {
      erros.push({ el: streetEl, msg: 'Informe o logradouro (rua).' });
    }

    const numberEl = document.getElementById('number');
    if (!formData.number) {
      erros.push({ el: numberEl, msg: 'Informe o número.' });
    }

    const neighborhoodEl = document.getElementById('neighborhood');
    if (!formData.neighborhood) {
      erros.push({ el: neighborhoodEl, msg: 'Informe o bairro.' });
    }

    const cityEl = document.getElementById('city');
    if (!formData.city) {
      erros.push({ el: cityEl, msg: 'Informe a cidade.' });
    }

    const stateEl = document.getElementById('state');
    if (!formData.state) {
      erros.push({ el: stateEl, msg: 'Selecione o estado.' });
    }

    // Responsável
    const responsibleEl = document.getElementById('responsible');
    if (!formData.responsible) {
      erros.push({ el: responsibleEl, msg: 'Informe o nome do responsável.' });
    } else if (!/^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u.test(formData.responsible)) {
      erros.push({ el: responsibleEl, msg: 'O nome do responsável deve conter somente letras.' });
    }

    const responsibleRelationshipEl = document.getElementById('responsible-relationship');
    if (!formData.responsible_relationship) {
      erros.push({ el: responsibleRelationshipEl, msg: 'Selecione o grau de parentesco.' });
    }

    const responsiblePhoneEl = document.getElementById('responsible-phone');
    if (!formData.responsible_phone) {
      erros.push({ el: responsiblePhoneEl, msg: 'Informe o telefone do responsável.' });
    } else if (!isValidMobilePhone(formData.responsible_phone) && !isValidResidentialPhone(formData.responsible_phone)) {
      erros.push({
        el: responsiblePhoneEl,
        msg: 'Telefone do responsável inválido. Use (00) 0000-0000 ou (00) 00000-0000.'
      });
    }

    // Peso (OBRIGATÓRIO)
    const pesoEl = document.getElementById('peso-kg');
    const resPeso = validarPesoKg(pesoEl?.value);
    if (!resPeso.valido) {
      erros.push({ el: pesoEl, msg: resPeso.mensagem });
    }

    // Altura (OBRIGATÓRIO, inteiros em cm)
    const alturaEl = document.getElementById('altura-cm');
    const resAltura = validarAlturaCm(alturaEl?.value);
    if (!resAltura.valido) {
      erros.push({ el: alturaEl, msg: resAltura.mensagem });
    }

    // Informações Clínicas: cada uma das 3 categorias deve ter resposta explícita
    const nenhumaCondicao = Boolean(document.getElementById('nenhuma-condicao')?.checked);
    const condicoesEntradaEl = document.getElementById('condicoes-saude-entrada');
    const temCondicoes = Boolean(formData.health_conditions && formData.health_conditions.trim());
    if (!nenhumaCondicao && !temCondicoes) {
      erros.push({
        el: condicoesEntradaEl,
        msg: 'Adicione ao menos uma condição de saúde ou confirme que não há ocorrências.'
      });
    }

    const nenhumaAlergia = Boolean(document.getElementById('nenhuma-alergia')?.checked);
    const alergiasEntradaEl = document.getElementById('alergias-entrada');
    const temAlergias = Boolean(formData.allergies && formData.allergies.trim());
    if (!nenhumaAlergia && !temAlergias) {
      erros.push({
        el: alergiasEntradaEl,
        msg: 'Adicione ao menos uma alergia ou confirme que não há ocorrências.'
      });
    }

    const nenhumMedicamento = Boolean(document.getElementById('nenhum-medicamento')?.checked);
    const medicamentosEntradaEl = document.getElementById('medicamentos-entrada');
    const temMedicamentos = Boolean(formData.medications_in_use && formData.medications_in_use.trim());
    if (!nenhumMedicamento && !temMedicamentos) {
      erros.push({
        el: medicamentosEntradaEl,
        msg: 'Adicione ao menos um medicamento em uso ou confirme que não há ocorrências.'
      });
    }

    // Observações clínicas passa a ser OPCIONAL (removido erro se vazio)

    // Situação do cadastro
    const statusEl = document.getElementById('status');
    if (!formData.status) {
      erros.push({ el: statusEl, msg: 'Selecione a situação do cadastro.' });
    }

    if (erros.length > 0) {
      erros.forEach(({ el, msg }) => {
        if (msg) marcarErroCampo(el, msg);
        else if (el) {
          el.classList.add('is-invalid');
          el.setAttribute('aria-invalid', 'true');
        }
      });

      const primeiro = erros.find((e) => e.el && typeof e.el.focus === 'function')?.el;
      if (primeiro) {
        primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        primeiro.focus();
      }

      return { valido: false, erros };
    }

    return { valido: true };
  }

  function validarFormularioPaciente(formData) {
    if (!formData.name) {
      return 'Por favor, preencha o nome completo';
    }

    if (!formData.birth_date) {
      return 'Por favor, preencha a data de nascimento';
    }

    const resCpf = validarCpf(formData.cpf);
    if (!resCpf.valido) {
      return resCpf.mensagem;
    }

    const contactError = validateContactFields(formData);
    if (contactError) {
      return contactError;
    }

    const resCep = validarCep(formData.cep);
    if (!resCep.valido) {
      return resCep.mensagem;
    }

    if (!formData.street) {
      return 'Por favor, preencha a rua';
    }

    if (!formData.number) {
      return 'Por favor, preencha o número do endereço';
    }

    if (!formData.neighborhood) {
      return 'Por favor, preencha o bairro';
    }

    if (!formData.city) {
      return 'Por favor, preencha a cidade';
    }

    if (!formData.state) {
      return 'Por favor, selecione o estado';
    }

    if (!formData.responsible) {
      return 'Por favor, preencha o nome do responsável';
    }

    if (!formData.responsible_phone) {
      return 'Por favor, preencha o telefone do responsável';
    }

    if (!isValidMobilePhone(formData.responsible_phone) && !isValidResidentialPhone(formData.responsible_phone)) {
      return 'Telefone do responsável inválido. Use (00) 0000-0000 ou (00) 00000-0000';
    }

    const resPeso = validarPesoKg(formData.weight_kg);
    if (!resPeso.valido) {
      return resPeso.mensagem;
    }

    const resAltura = validarAlturaCm(formData.height_cm);
    if (!resAltura.valido) {
      return resAltura.mensagem;
    }

    const condicoesAvaliadas = Boolean(
      formData.health_conditions_evaluated ||
      formData.has_no_health_conditions ||
      (formData.health_conditions && formData.health_conditions.trim())
    );
    if (!condicoesAvaliadas) {
      return 'Por favor, informe ao menos uma condição de saúde ou confirme que não há ocorrências';
    }

    const alergiasAvaliadas = Boolean(
      formData.allergies_evaluated ||
      formData.has_no_allergies ||
      (formData.allergies && formData.allergies.trim())
    );
    if (!alergiasAvaliadas) {
      return 'Por favor, informe ao menos uma alergia ou confirme que não há ocorrências';
    }

    const medicamentosAvaliados = Boolean(
      formData.medications_in_use_evaluated ||
      formData.has_no_medications ||
      (formData.medications_in_use && formData.medications_in_use.trim())
    );
    if (!medicamentosAvaliados) {
      return 'Por favor, informe ao menos um medicamento em uso ou confirme que não há ocorrências';
    }

    // Observações clínicas agora é opcional

    if (!formData.status) {
      return 'Por favor, selecione a situação do cadastro';
    }

    return null;
  }


  function obterIniciaisPaciente(nome, fallback = '--') {
    const partes = String(nome || '')
      .replace(/\[TESTE[^\]]*\]/gi, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!partes.length) return fallback;
    if (partes.length === 1) return partes[0].slice(0, 2).toLocaleUpperCase('pt-BR');

    return `${partes[0][0]}${partes[1][0]}`.toLocaleUpperCase('pt-BR');
  }

  window.PatientFormUtils = {
    obterIniciaisPaciente,
    formatResidentialPhone,
    formatMobilePhone,
    isValidResidentialPhone,
    isValidMobilePhone,
    formatCPF,
    formatCEP,
    convertBrDateToDb,
    validateContactFields,
    normalizePatientTextFields,
    separarListaClinica,
    inicializarEditoresClinicosPaciente,
    configurarControlesClinicosSemOcorrencia,
    attachPhoneMasks,
    attachCpfMask,
    attachCepAutoFill,
    validarAlturaCm,
    normalizarAlturaCm,
    vincularRestricaoAltura,
    validarPesoKg,
    normalizarPesoKg,
    validarCpf,
    validarCep,
    parseDateParts,
    calcularIdade,
    calcularIMC,
    classificarIMC,
    atualizarExibicaoIMC,
    vincularCalculoIMC,
    marcarErroCampo,
    limparErroCampo,
    limparTodosErros,
    validarEExibirErrosFormulario,
    validarFormularioPaciente
  };
})();
