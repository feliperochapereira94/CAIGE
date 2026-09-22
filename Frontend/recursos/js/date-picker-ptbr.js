(function () {
  function resolveLocale() {
    if (!window.flatpickr || !window.flatpickr.l10ns) {
      return 'pt';
    }

    if (window.flatpickr.l10ns.pt && window.flatpickr.l10ns.default !== window.flatpickr.l10ns.pt) {
      window.flatpickr.localize(window.flatpickr.l10ns.pt);
    }

    return 'pt';
  }

  function initPtBrDatePicker(selector, options = {}) {
    if (!window.flatpickr) return [];

    // Mantém os hooks globais do CAIGE mesmo quando a tela fornece callbacks
    // próprios. Antes, o spread final de `options` podia substituir onReady,
    // onOpen, onChange etc. e desativar parte do comportamento compartilhado.
    const {
      onReady: userOnReady,
      onOpen: userOnOpen,
      onMonthChange: userOnMonthChange,
      onYearChange: userOnYearChange,
      onClose: userOnClose,
      onDestroy: userOnDestroy,
      onChange: userOnChange,
      ...userOptions
    } = options;

    const locale = resolveLocale();
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return [];

    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const escalaUI = () => {
      if (!document.documentElement.classList.contains('caige-ui-escalada')) return 1;
      const valor = parseFloat(
        getComputedStyle(document.body).getPropertyValue('--escala-ui-desktop') || '1'
      );
      return Number.isFinite(valor) && valor > 0 ? valor : 1;
    };

    const posicionarNoCampo = (instance) => {
      if (!instance?.isOpen || !instance.calendarContainer) return;
      const ancora = instance.altInput || instance.input;
      if (!ancora) return;

      requestAnimationFrame(() => {
        const rect = ancora.getBoundingClientRect();
        const calendario = instance.calendarContainer;
        const escala = escalaUI();
        const larguraVisual = calendario.offsetWidth * escala;
        const alturaVisual = calendario.offsetHeight * escala;
        const margemVisual = 6;

        let leftVisual = rect.left;
        const maxLeft = window.innerWidth - larguraVisual - margemVisual;
        leftVisual = Math.max(margemVisual, Math.min(leftVisual, maxLeft));

        const cabeAbaixo = window.innerHeight - rect.bottom >= alturaVisual + margemVisual;
        const cabeAcima = rect.top >= alturaVisual + margemVisual;
        let topVisual = rect.bottom + margemVisual;
        if (!cabeAbaixo && cabeAcima) topVisual = rect.top - alturaVisual - margemVisual;

        // O desktop CAIGE usa transform: scale() no body. As coordenadas CSS do
        // calendário precisam voltar para a viewport virtual antes do scale.
        calendario.style.position = 'fixed';
        calendario.style.left = `${leftVisual / escala}px`;
        calendario.style.top = `${topVisual / escala}px`;
        calendario.style.right = 'auto';
        calendario.style.bottom = 'auto';
      });
    };

    const fecharMeses = (instance) => {
      if (!instance?.__caigeMesesPainel) return;
      instance.__caigeMesesPainel.hidden = true;
      instance.__caigeMesesBotao?.setAttribute('aria-expanded', 'false');
    };

    const atualizarMes = (instance) => {
      if (!instance?.__caigeMesesBotao) return;
      instance.__caigeMesesBotao.textContent = meses[instance.currentMonth] || '';
      instance.__caigeMesesPainel?.querySelectorAll('[data-caige-mes]').forEach((botao) => {
        const ativo = Number(botao.dataset.caigeMes) === instance.currentMonth;
        botao.classList.toggle('is-active', ativo);
        botao.setAttribute('aria-selected', ativo ? 'true' : 'false');
      });
    };

    const instalarMeses = (instance) => {
      const atual = instance.calendarContainer?.querySelector('.flatpickr-current-month');
      const nativo = atual?.querySelector('.flatpickr-monthDropdown-months');
      if (!atual || !nativo || instance.__caigeMesesBotao) return;

      nativo.classList.add('caige-month-native-hidden');

      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'caige-month-trigger';
      botao.setAttribute('aria-label', 'Selecionar mês');
      botao.setAttribute('aria-expanded', 'false');

      const painel = document.createElement('div');
      painel.className = 'caige-month-panel';
      painel.hidden = true;
      painel.setAttribute('role', 'listbox');

      meses.forEach((nome, indice) => {
        const opcao = document.createElement('button');
        opcao.type = 'button';
        opcao.className = 'caige-month-option';
        opcao.textContent = nome;
        opcao.dataset.caigeMes = String(indice);
        opcao.setAttribute('role', 'option');
        opcao.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          instance.changeMonth(indice, false);
          atualizarMes(instance);
          fecharMeses(instance);
          posicionarNoCampo(instance);
        });
        painel.appendChild(opcao);
      });

      botao.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const abrir = painel.hidden;
        painel.hidden = !abrir;
        botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      });

      atual.insertBefore(botao, nativo);
      instance.calendarContainer.appendChild(painel);
      instance.__caigeMesesBotao = botao;
      instance.__caigeMesesPainel = painel;
      atualizarMes(instance);
    };

    const defaultConfig = {
      locale,
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      allowInput: false,
      disableMobile: true,
      monthSelectorType: 'dropdown',

      onReady(selectedDates, dateStr, instance) {
        const yearInput = instance.calendarContainer?.querySelector('input.cur-year');
        if (yearInput) {
          yearInput.maxLength = 4;
          yearInput.setAttribute('inputmode', 'numeric');
          yearInput.addEventListener('input', () => {
            yearInput.value = String(yearInput.value || '').replace(/\D/g, '').slice(0, 4);
          });
        }
        instalarMeses(instance);

        const fecharAoRolar = (event) => {
          if (!instance.isOpen) return;
          if (event.target instanceof Node && instance.calendarContainer?.contains(event.target)) return;
          instance.close();
        };
        window.addEventListener('scroll', fecharAoRolar, true);
        instance.__caigeFecharAoRolar = fecharAoRolar;

        if (instance.altInput && instance.input && instance.input.id) {
          const altId = `${instance.input.id}-display`;
          instance.altInput.id = altId;
          const label = document.querySelector(`label[for="${instance.input.id}"]`);
          if (label) label.setAttribute('for', altId);
        }
        if (typeof userOnReady === 'function') userOnReady(selectedDates, dateStr, instance);
      },

      onOpen(selectedDates, dateStr, instance) {
        instalarMeses(instance);
        atualizarMes(instance);
        setTimeout(() => posicionarNoCampo(instance), 0);
        if (typeof userOnOpen === 'function') userOnOpen(selectedDates, dateStr, instance);
      },

      onMonthChange(selectedDates, dateStr, instance) {
        atualizarMes(instance);
        fecharMeses(instance);
        posicionarNoCampo(instance);
        if (typeof userOnMonthChange === 'function') userOnMonthChange(selectedDates, dateStr, instance);
      },

      onYearChange(selectedDates, dateStr, instance) {
        atualizarMes(instance);
        posicionarNoCampo(instance);
        if (typeof userOnYearChange === 'function') userOnYearChange(selectedDates, dateStr, instance);
      },

      onClose(selectedDates, dateStr, instance) {
        fecharMeses(instance);
        if (typeof userOnClose === 'function') userOnClose(selectedDates, dateStr, instance);
      },

      onDestroy(selectedDates, dateStr, instance) {
        if (instance.__caigeFecharAoRolar) {
          window.removeEventListener('scroll', instance.__caigeFecharAoRolar, true);
        }
        if (instance.input && instance.input.id) {
          const altId = `${instance.input.id}-display`;
          const label = document.querySelector(`label[for="${altId}"]`);
          if (label) label.setAttribute('for', instance.input.id);
        }
        if (typeof userOnDestroy === 'function') userOnDestroy(selectedDates, dateStr, instance);
      },

      onChange(selectedDates, dateStr, instance) {
        instance.input.dispatchEvent(new Event('input', { bubbles: true }));
        instance.input.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof userOnChange === 'function') userOnChange(selectedDates, dateStr, instance);
      }
    };

    return Array.from(elements).map((element) =>
      window.flatpickr(element, { ...defaultConfig, ...userOptions })
    );
  }

  window.initPtBrDatePicker = initPtBrDatePicker;
})();
