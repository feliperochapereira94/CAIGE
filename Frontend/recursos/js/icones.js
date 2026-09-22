// =========================================================
// CAIGE - ÍCONES DE INTERFACE
// =========================================================
// Fonte única de ícones SVG da interface.
//
// Uso estático:
//   <span class="icone" data-icone="buscar" aria-hidden="true"></span>
//
// Uso em conteúdo criado por JavaScript:
//   IconesCAIGE.aplicar(elementoPai);
// =========================================================

(() => {
  const criarSvg = (conteudo) => `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
      ${conteudo}
    </svg>
  `;

  const ICONES = Object.freeze({
    clinico: criarSvg(`
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    `),
    saude: criarSvg(`
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    `),
    alerta: criarSvg(`
      <path d="M10.3 4.2 3.2 17a2 2 0 0 0 1.8 3h14a2 2 0 0 0 1.8-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    `),
    medicamento: criarSvg(`
      <path d="m8.5 15.5 7-7a3.5 3.5 0 1 1 5 5l-7 7a3.5 3.5 0 1 1-5-5Z" />
      <path d="m11 13 5 5" />
    `),
    
    endereco: criarSvg(`<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2" />`),
    telefone: criarSvg(`<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />`),
    usuarios: criarSvg(`<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" /><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" /><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />`),
    documento: criarSvg(`<path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="14 2 14 8 20 8" /><line stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x1="16" y1="13" x2="8" y2="13" /><line stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x1="16" y1="17" x2="8" y2="17" /><polyline stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="10 9 9 9 8 9" />`),
    identificacao: criarSvg(`<rect stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x="3" y="6" width="18" height="12" rx="2" /><circle stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" cx="8.5" cy="12" r="1.5" /><line stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x1="13" y1="11" x2="19" y2="11" /><line stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x1="13" y1="13" x2="17" y2="13" />`),

    observacao: criarSvg(`
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4M8 12h8M8 16h6" />
    `),
    prontuario: criarSvg(`
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4M9 12h6M9 16h4" />
    `),
    buscar: criarSvg(`
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    `),
    visualizar: criarSvg(`
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    `),
    comparar: criarSvg(`
      <path d="M7 4v16M17 4v16M4 8h6M14 16h6" />
      <path d="m8 6 2 2-2 2M16 14l-2 2 2 2" />
    `),
    imprimir: criarSvg(`
      <path d="M7 8V4h10v4M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v6H7zM17 12h.01" />
    `),
    baixar: criarSvg(`
      <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19h14" />
    `),
    menu: criarSvg(`
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    `),
    'chevron-baixo': criarSvg(`
      <path d="m7 10 5 5 5-5" />
    `),
    'chevron-direita': criarSvg(`
      <path d="m9 7 5 5-5 5" />
    `),
    'chevron-esquerda': criarSvg(`
      <path d="m15 18-6-6 6-6" />
    `),
    'seta-esquerda': criarSvg(`
      <path d="M19 12H5M12 19l-7-7 7-7" />
    `),
    mais: criarSvg(`
      <path d="M12 5v14M5 12h14" />
    `),
    fechar: criarSvg(`
      <path d="m7 7 10 10M17 7 7 17" />
    `),
    editar: criarSvg(`
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    `),
    excluir: criarSvg(`
      <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    `),
    sucesso: criarSvg(`
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 5-5" />
    `),
    erro: criarSvg(`
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    `),
    informacao: criarSvg(`
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 11v5" />
    `),
    arquivar: criarSvg(`
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    `),
    recuperar: criarSvg(`
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    `),
    sair: criarSvg(`
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    `),
    painel: criarSvg(`
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    `),
    movimentacoes: criarSvg(`
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14h6M9 18h4" />
    `),
    pacientes: criarSvg(`
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    `),
    prontuarios: criarSvg(`
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4M9 12h6M9 16h4" />
    `),
    frequencia: criarSvg(`
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <path d="M3 20h18" />
    `),
    gerenciamento: criarSvg(`
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    `),
    'caixa-vazia': criarSvg(`
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    `),
    usuario: criarSvg(`
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    `),
    feminino: criarSvg(`
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v8M8.5 17.5h7" />
    `),
    masculino: criarSvg(`
      <circle cx="9.5" cy="14.5" r="5" />
      <path d="m13 11 7-7M15 4h5v5" />
    `),
    cursos: criarSvg(`
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
    `),
    calendario: criarSvg(`
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    `),
    email: criarSvg(`
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    `),
    cadeado: criarSvg(`
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    `),
    pergunta: criarSvg(`
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.5 2.5 0 1 1 4.4 1.6c-.8.8-2.2 1.3-2.2 2.9" />
      <path d="M12 17h.01" />
    `),
    auditoria: criarSvg(`
      <path d="M9 5h6M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1Z" />
      <path d="M7 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1" />
      <path d="M8 11h8M8 15h8M8 19h5" />
    `),
    mensagem: criarSvg(`
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.7-4.4A8.3 8.3 0 1 1 21 11.5Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
    `),
    'primeira-pagina': criarSvg(`
      <path d="M18 17l-5-5 5-5M11 17l-5-5 5-5M4 6v12" />
    `),
    'ultima-pagina': criarSvg(`
      <path d="m6 7 5 5-5 5M13 7l5 5-5 5M20 6v12" />
    `),
    spinner: criarSvg(`
      <path d="M20 12a8 8 0 1 1-8-8" />
    `)
  });

  function obterSvg(nome) {
    return ICONES[nome] || '';
  }

  function aplicar(raiz = document) {
    raiz.querySelectorAll?.('[data-icone]').forEach((elemento) => {
      const nome = elemento.dataset.icone;
      const svg = obterSvg(nome);

      if (!svg || elemento.dataset.iconeAplicado === nome) {
        return;
      }

      elemento.innerHTML = svg;
      elemento.classList.add('icone');
      elemento.dataset.iconeAplicado = nome;

      if (elemento.hasAttribute('aria-label')) {
        elemento.setAttribute('role', 'img');
        elemento.removeAttribute('aria-hidden');
      } else {
        elemento.setAttribute('aria-hidden', 'true');
      }
    });
  }

  window.IconesCAIGE = Object.freeze({
    aplicar,
    obterSvg,
    nomes: Object.freeze(Object.keys(ICONES))
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => aplicar(), { once: true });
  } else {
    aplicar();
  }
})();
