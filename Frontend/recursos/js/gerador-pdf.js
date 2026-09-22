// =========================================================
// CAIGE - GERADOR PDF INSTITUCIONAL
// =========================================================
// Compartilha identidade, margens, cabeçalho, metadados,
// indicadores, estilo de tabelas e rodapé entre relatórios.
// Requer jsPDF e jsPDF-AutoTable carregados pela página.
// =========================================================

(() => {
  const CORES = Object.freeze({
    azul900: [24, 53, 111],
    azul800: [23, 60, 143],
    azul700: [23, 73, 183],
    azul600: [31, 96, 232],
    azul100: [233, 241, 255],
    azul50: [245, 248, 255],
    cinza900: [17, 24, 39],
    cinza800: [31, 41, 55],
    cinza700: [55, 65, 81],
    cinza500: [107, 114, 128],
    cinza400: [156, 163, 175],
    cinza300: [209, 213, 219],
    cinza200: [229, 231, 235],
    cinza50: [249, 250, 251],
    branco: [255, 255, 255]
  });

  function obterConstrutor() {
    return window.jspdf?.jsPDF || null;
  }

  function criarDocumento({ orientation = 'portrait' } = {}) {
    const JsPDF = obterConstrutor();
    if (!JsPDF) return null;

    return new JsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });
  }

  async function carregarImagemComoDataUrl(url) {
    try {
      const resposta = await fetch(url);
      if (!resposta.ok) return null;

      const blob = await resposta.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Não foi possível carregar a imagem institucional do PDF:', error);
      return null;
    }
  }

  function desenharMarca(doc, { logo, margemX, y }) {
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', margemX, y, 46, 10.5, undefined, 'FAST');
        return;
      } catch (error) {
        console.warn('Não foi possível inserir a logo no PDF:', error);
      }
    }

    doc.setTextColor(...CORES.azul800);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text('CAIGE · UNIVALE', margemX, y + 7);
  }

  function desenharCabecalho(doc, {
    logo = null,
    titulo,
    subtitulo = '',
    pagina = 1,
    margemX = 10,
    y = 8
  } = {}) {
    const larguraPagina = doc.internal.pageSize.getWidth();
    const xTexto = margemX + 52;

    desenharMarca(doc, { logo, margemX, y });

    doc.setTextColor(...CORES.cinza900);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(String(titulo || 'Documento CAIGE'), xTexto, y + 5);

    if (subtitulo) {
      const textoSubtitulo = pagina > 1 && !String(subtitulo).includes('Continuação')
        ? `${subtitulo} · Continuação`
        : subtitulo;

      doc.setTextColor(...CORES.cinza500);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(String(textoSubtitulo), xTexto, y + 10);
    }

    doc.setDrawColor(...CORES.azul100);
    doc.setLineWidth(0.6);
    doc.line(margemX, y + 15, larguraPagina - margemX, y + 15);

    return y + 20;
  }

  function desenharMetadados(doc, {
    itens = [],
    y = 28,
    margemX = 10,
    colunas = 3,
    gap = 5
  } = {}) {
    const dados = itens.filter((item) => item && item.rotulo);
    if (!dados.length) return y;

    const larguraPagina = doc.internal.pageSize.getWidth();
    const colunasSeguras = Math.max(1, Math.min(Number(colunas) || 1, dados.length));
    const larguraUtil = larguraPagina - (margemX * 2) - (gap * (colunasSeguras - 1));
    const larguraColuna = larguraUtil / colunasSeguras;
    const alturaLinha = 11.5;
    const linhas = Math.ceil(dados.length / colunasSeguras);

    dados.forEach((item, indice) => {
      const coluna = indice % colunasSeguras;
      const linha = Math.floor(indice / colunasSeguras);
      const x = margemX + coluna * (larguraColuna + gap);
      const yItem = y + linha * alturaLinha;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...CORES.cinza500);
      doc.text(String(item.rotulo).toUpperCase(), x, yItem);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...CORES.cinza800);
      const valor = String(item.valor ?? '—');
      const linhasValor = doc.splitTextToSize(valor, larguraColuna - 1);
      doc.text(linhasValor.slice(0, 2), x, yItem + 4.2);
    });

    const fim = y + linhas * alturaLinha;
    doc.setDrawColor(...CORES.cinza200);
    doc.setLineWidth(0.25);
    doc.line(margemX, fim, larguraPagina - margemX, fim);

    return fim + 4;
  }

  function desenharIndicadores(doc, {
    itens = [],
    y,
    margemX = 10,
    gap = 4
  } = {}) {
    const dados = itens.filter((item) => item && item.rotulo);
    if (!dados.length) return y;

    const larguraPagina = doc.internal.pageSize.getWidth();
    const larguraUtil = larguraPagina - (margemX * 2) - (gap * (dados.length - 1));
    const larguraItem = larguraUtil / dados.length;
    const altura = 13;

    dados.forEach((item, indice) => {
      const x = margemX + indice * (larguraItem + gap);

      doc.setFillColor(...CORES.azul50);
      doc.setDrawColor(...CORES.azul100);
      doc.rect(x, y, larguraItem, altura, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...CORES.cinza500);
      doc.text(String(item.rotulo).toUpperCase(), x + 3, y + 4.3);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(...CORES.azul800);
      doc.text(String(item.valor ?? '—'), x + 3, y + 10.2);
    });

    return y + altura + 5;
  }

  function obterEstilosTabela({ fontSize = 8.4, cabecalhoEscuro = true } = {}) {
    return {
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize,
        textColor: CORES.cinza700,
        lineColor: CORES.cinza200,
        lineWidth: 0.2,
        cellPadding: { top: 2.5, right: 2.4, bottom: 2.5, left: 2.4 },
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: cabecalhoEscuro
        ? {
            fillColor: CORES.azul800,
            textColor: CORES.branco,
            fontStyle: 'bold',
            fontSize: Math.max(7.6, fontSize - 0.2),
            lineColor: CORES.azul700,
            lineWidth: 0.2
          }
        : {
            fillColor: CORES.azul50,
            textColor: CORES.azul800,
            fontStyle: 'bold',
            fontSize: Math.max(7.6, fontSize - 0.2),
            lineColor: CORES.azul100,
            lineWidth: 0.2
          },
      alternateRowStyles: {
        fillColor: CORES.cinza50
      }
    };
  }

  function adicionarRodapes(doc, {
    agora = new Date(),
    margemX = 10,
    textoEsquerda = 'Relatório gerado pelo CAIGE'
  } = {}) {
    const totalPaginas = doc.internal.getNumberOfPages();
    const larguraPagina = doc.internal.pageSize.getWidth();
    const alturaPagina = doc.internal.pageSize.getHeight();
    const dataHora = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
      doc.setPage(pagina);
      doc.setDrawColor(...CORES.cinza200);
      doc.setLineWidth(0.25);
      doc.line(margemX, alturaPagina - 10, larguraPagina - margemX, alturaPagina - 10);

      doc.setTextColor(...CORES.cinza400);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.text(textoEsquerda, margemX, alturaPagina - 5.5);
      doc.text(`${dataHora} · Página ${pagina} de ${totalPaginas}`, larguraPagina - margemX, alturaPagina - 5.5, { align: 'right' });
    }
  }

  function gerarStamp(data = new Date()) {
    return `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, '0')}${String(data.getDate()).padStart(2, '0')}_${String(data.getHours()).padStart(2, '0')}${String(data.getMinutes()).padStart(2, '0')}`;
  }

  function formatarDataHoraDocumento(data = new Date()) {
    return `${data.toLocaleDateString('pt-BR')}, ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function desenharCabecalhoClinico(doc, {
    modelo,
    logo = null,
    continuacao = false,
    margemX = 12
  } = {}) {
    const larguraPagina = doc.internal.pageSize.getWidth();

    if (continuacao) {
      if (logo) {
        try {
          doc.addImage(logo, 'PNG', margemX, 9, 38, 8.7, undefined, 'FAST');
        } catch {
          desenharMarca(doc, { logo: null, margemX, y: 8 });
        }
      } else {
        desenharMarca(doc, { logo: null, margemX, y: 8 });
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(...CORES.cinza900);
      doc.text(String(modelo.titulo || 'Prontuário'), 58, 13.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(...CORES.cinza500);
      doc.text('Documento clínico · Continuação', 58, 18);

      doc.setDrawColor(...CORES.azul700);
      doc.setLineWidth(0.45);
      doc.line(margemX, 23, larguraPagina - margemX, 23);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.1);
      doc.setTextColor(...CORES.cinza500);
      doc.text('PACIENTE', margemX, 29);
      doc.text('CURSO', 108, 29);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(...CORES.cinza900);
      doc.text(String(modelo.paciente || 'Paciente'), margemX, 33.5);
      doc.text(String(modelo.curso || 'Curso não identificado'), 108, 33.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.3);
      doc.setTextColor(...CORES.cinza900);
      doc.text('Perguntas e respostas · Continuação', margemX, 42);

      return 47;
    }

    if (logo) {
      try {
        doc.addImage(logo, 'PNG', margemX, 9.2, 58, 13.2, undefined, 'FAST');
      } catch {
        desenharMarca(doc, { logo: null, margemX, y: 10 });
      }
    } else {
      desenharMarca(doc, { logo: null, margemX, y: 10 });
    }

    const xTitulo = 72;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...CORES.cinza700);
    doc.text('DOCUMENTO CLÍNICO', xTitulo, 12.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15.2);
    doc.setTextColor(...CORES.cinza900);
    doc.text(String(modelo.titulo || 'Prontuário'), xTitulo, 20.5);

    let fimTitulo = 25.2;
    const descricao = String(modelo.descricao || '').trim();
    if (descricao) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.7);
      doc.setTextColor(...CORES.cinza500);
      const linhasDescricao = doc.splitTextToSize(descricao, larguraPagina - xTitulo - margemX).slice(0, 2);
      doc.text(linhasDescricao, xTitulo, fimTitulo);
      fimTitulo += linhasDescricao.length * 3.5;
    }

    const yDivisor = Math.max(31.5, fimTitulo + 1.5);
    doc.setDrawColor(...CORES.azul700);
    doc.setLineWidth(0.5);
    doc.line(margemX, yDivisor, larguraPagina - margemX, yDivisor);

    const xDireita = 108;
    const yRotulo1 = yDivisor + 8;
    const yValor1 = yRotulo1 + 4.8;
    const yRotulo2 = yValor1 + 9;
    const yValor2 = yRotulo2 + 4.8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...CORES.cinza700);
    doc.text('PACIENTE', margemX, yRotulo1);
    doc.text('CURSO', xDireita, yRotulo1);
    doc.text('PROFISSIONAL', margemX, yRotulo2);
    doc.text('DATA DO LANÇAMENTO', xDireita, yRotulo2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...CORES.cinza900);
    doc.text(String(modelo.paciente || 'Paciente'), margemX, yValor1);
    doc.text(String(modelo.curso || 'Curso não identificado'), xDireita, yValor1);
    doc.text(String(modelo.profissional || 'Não identificado'), margemX, yValor2);
    doc.text(String(modelo.dataLancamento || '—'), xDireita, yValor2);

    const yFimMeta = yValor2 + 6.5;
    doc.setDrawColor(...CORES.cinza200);
    doc.setLineWidth(0.25);
    doc.line(margemX, yFimMeta, larguraPagina - margemX, yFimMeta);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...CORES.cinza900);
    doc.text('Perguntas e respostas', margemX, yFimMeta + 9);

    return yFimMeta + 14;
  }

  function medirOpcoesClinicas(doc, opcoes, larguraUtil, escala = false) {
    if (!Array.isArray(opcoes) || !opcoes.length) return 7;

    doc.setFont('helvetica', escala ? 'bold' : 'normal');
    doc.setFontSize(7.4);

    let linha = 1;
    let usado = 0;
    const gap = 2;

    opcoes.forEach((opcao) => {
      const largura = escala
        ? 7.2
        : Math.max(12, doc.getTextWidth(String(opcao)) + 8.2);

      if (usado > 0 && usado + gap + largura > larguraUtil) {
        linha += 1;
        usado = largura;
      } else {
        usado += (usado > 0 ? gap : 0) + largura;
      }
    });

    return linha * 6.2 + Math.max(0, linha - 1) * 1.4;
  }

  function medirPerguntaClinica(doc, pergunta, largura) {
    const larguraTitulo = Math.max(20, largura - 16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    const linhasTitulo = doc.splitTextToSize(String(pergunta.titulo || ''), larguraTitulo);
    const alturaTitulo = Math.max(4.2, linhasTitulo.length * 3.6);

    let alturaResposta = 7;
    if (pergunta.tipo === 'texto_livre' || !Array.isArray(pergunta.opcoes) || !pergunta.opcoes.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.1);
      const linhasResposta = doc.splitTextToSize(String(pergunta.resposta || 'Não informado'), largura - 10);
      alturaResposta = Math.max(8, linhasResposta.length * 4);
    } else {
      alturaResposta = medirOpcoesClinicas(doc, pergunta.opcoes, largura - 8, pergunta.tipo === 'escala');
    }

    return Math.max(20, 3.5 + alturaTitulo + 2.4 + alturaResposta + 3.5);
  }

  function desenharOpcaoClinica(doc, {
    x,
    y,
    largura,
    texto,
    selecionada = false,
    escala = false
  } = {}) {
    const altura = 5.8;
    const raio = 2.6;

    doc.setLineWidth(0.25);
    if (selecionada) {
      doc.setDrawColor(...CORES.azul600);
      doc.setTextColor(...CORES.azul700);
      doc.setFillColor(...CORES.branco);
    } else {
      doc.setDrawColor(...CORES.cinza300);
      doc.setTextColor(...CORES.cinza500);
      doc.setFillColor(...CORES.branco);
    }

    doc.roundedRect(x, y, largura, altura, raio, raio, 'FD');

    if (!escala) {
      doc.setDrawColor(...(selecionada ? CORES.azul600 : CORES.cinza400));
      doc.circle(x + 3.1, y + (altura / 2), 0.95, 'S');
      if (selecionada) {
        doc.setFillColor(...CORES.azul600);
        doc.circle(x + 3.1, y + (altura / 2), 0.48, 'F');
      }
    }

    doc.setFont('helvetica', selecionada || escala ? 'bold' : 'normal');
    doc.setFontSize(7.3);
    doc.text(String(texto), escala ? x + largura / 2 : x + 5.3, y + 3.8, escala ? { align: 'center' } : undefined);
  }

  function desenharPerguntaClinica(doc, pergunta, {
    x,
    y,
    largura,
    altura = null
  } = {}) {
    const alturaBloco = altura || medirPerguntaClinica(doc, pergunta, largura);

    doc.setFillColor(...CORES.branco);
    doc.setDrawColor(...CORES.cinza200);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, largura, alturaBloco, 1.2, 1.2, 'FD');

    const numero = String(pergunta.numero || 1).padStart(2, '0');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...CORES.azul600);
    doc.text(numero, x + 3.2, y + 5.1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(...CORES.cinza900);
    const linhasTitulo = doc.splitTextToSize(String(pergunta.titulo || ''), largura - 16);
    doc.text(linhasTitulo, x + 10, y + 5.1);

    let yResposta = y + 5.1 + Math.max(0, linhasTitulo.length - 1) * 3.6 + 5.2;

    if (pergunta.tipo === 'texto_livre' || !Array.isArray(pergunta.opcoes) || !pergunta.opcoes.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.1);
      doc.setTextColor(...CORES.cinza700);
      const linhasResposta = doc.splitTextToSize(String(pergunta.resposta || 'Não informado'), largura - 10);
      doc.text(linhasResposta, x + 6.2, yResposta);
      return alturaBloco;
    }

    const escala = pergunta.tipo === 'escala';
    const larguraUtil = largura - 8;
    const gap = 2;
    let cursorX = x + 4;
    let cursorY = yResposta - 3.7;

    pergunta.opcoes.forEach((opcao) => {
      const texto = String(opcao);
      doc.setFont('helvetica', escala ? 'bold' : 'normal');
      doc.setFontSize(7.3);
      const larguraOpcao = escala
        ? 7.2
        : Math.max(12, doc.getTextWidth(texto) + 8.2);

      if (cursorX > x + 4 && cursorX + larguraOpcao > x + 4 + larguraUtil) {
        cursorX = x + 4;
        cursorY += 7.2;
      }

      const selecionada = escala
        ? Number(pergunta.selecionada) === Number(opcao)
        : String(pergunta.selecionada) === texto;

      desenharOpcaoClinica(doc, {
        x: cursorX,
        y: cursorY,
        largura: larguraOpcao,
        texto,
        selecionada,
        escala
      });

      cursorX += larguraOpcao + gap;
    });

    return alturaBloco;
  }

  function desenharPerguntaTextoPaginada(doc, pergunta, {
    x,
    y,
    largura,
    limiteInferior,
    novaPagina
  } = {}) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.1);
    let linhasRestantes = doc.splitTextToSize(String(pergunta.resposta || 'Não informado'), largura - 10);
    let primeiraParte = true;
    let cursorY = y;

    while (linhasRestantes.length) {
      const tituloParte = primeiraParte
        ? String(pergunta.titulo || '')
        : `${String(pergunta.titulo || '')} · Continuação`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.4);
      const linhasTitulo = doc.splitTextToSize(tituloParte, largura - 16);
      const alturaTitulo = Math.max(4.2, linhasTitulo.length * 3.6);
      const overhead = 3.5 + alturaTitulo + 2.4 + 3.5;
      let alturaDisponivel = limiteInferior - cursorY;
      let maxLinhas = Math.floor((alturaDisponivel - overhead) / 4);

      if (maxLinhas < 2 && linhasRestantes.length > 1) {
        cursorY = novaPagina();
        continue;
      }

      maxLinhas = Math.max(1, maxLinhas);
      const trecho = linhasRestantes.splice(0, maxLinhas);
      const altura = Math.max(20, overhead + trecho.length * 4);

      doc.setFillColor(...CORES.branco);
      doc.setDrawColor(...CORES.cinza200);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, cursorY, largura, altura, 1.2, 1.2, 'FD');

      const numero = String(pergunta.numero || 1).padStart(2, '0');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(...CORES.azul600);
      doc.text(numero, x + 3.2, cursorY + 5.1);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.4);
      doc.setTextColor(...CORES.cinza900);
      doc.text(linhasTitulo, x + 10, cursorY + 5.1);

      const yResposta = cursorY + 5.1 + Math.max(0, linhasTitulo.length - 1) * 3.6 + 5.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.1);
      doc.setTextColor(...CORES.cinza700);
      doc.text(trecho, x + 6.2, yResposta);

      cursorY += altura + 4;
      primeiraParte = false;

      if (linhasRestantes.length) {
        cursorY = novaPagina();
      }
    }

    return cursorY;
  }

  function agruparPerguntasClinicas(perguntas) {
    const grupos = [];
    let indice = 0;

    while (indice < perguntas.length) {
      const atual = perguntas[indice];
      if (atual.ampla) {
        grupos.push([atual]);
        indice += 1;
        continue;
      }

      const proxima = perguntas[indice + 1];
      if (proxima && !proxima.ampla) {
        grupos.push([atual, proxima]);
        indice += 2;
      } else {
        grupos.push([atual]);
        indice += 1;
      }
    }

    return grupos;
  }

  function adicionarRodapesClinicos(doc, {
    agora = new Date(),
    margemX = 12
  } = {}) {
    const totalPaginas = doc.internal.getNumberOfPages();
    const larguraPagina = doc.internal.pageSize.getWidth();
    const alturaPagina = doc.internal.pageSize.getHeight();
    const emissao = formatarDataHoraDocumento(agora);

    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
      doc.setPage(pagina);
      doc.setDrawColor(...CORES.cinza200);
      doc.setLineWidth(0.25);
      doc.line(margemX, alturaPagina - 13.5, larguraPagina - margemX, alturaPagina - 13.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...CORES.cinza500);
      doc.text('Documento clínico gerado pelo CAIGE', margemX, alturaPagina - 8.3);

      const textoDireita = totalPaginas > 1
        ? `Emitido em ${emissao} · Página ${pagina} de ${totalPaginas}`
        : `Emitido em ${emissao}`;
      doc.text(textoDireita, larguraPagina - margemX, alturaPagina - 8.3, { align: 'right' });
    }
  }

  async function exportarProntuarioClinico({
    registros,
    paciente,
    abrirParaImpressao = true
  } = {}) {
    if (!window.RenderizadorProntuario?.obterModelo) {
      throw new Error('Renderizador de prontuário indisponível.');
    }

    const modelos = window.RenderizadorProntuario.obterModelo(registros, paciente);
    if (!modelos.length) {
      throw new Error('Nenhum prontuário disponível para gerar o PDF.');
    }

    const doc = criarDocumento({ orientation: 'portrait' });
    if (!doc) {
      throw new Error('Não foi possível carregar o gerador de PDF.');
    }

    const janelaImpressao = abrirParaImpressao ? window.open('', '_blank') : null;
    if (janelaImpressao) {
      try {
        janelaImpressao.document.title = 'Preparando prontuário - CAIGE';
        janelaImpressao.document.body.innerHTML = '<p style="font-family:Arial,sans-serif;padding:24px;color:#374151">Preparando documento clínico...</p>';
      } catch {
        // A janela é apenas um apoio para evitar bloqueio do navegador.
      }
    }

    try {
      const logo = await carregarImagemComoDataUrl('/recursos/images/logocaige.png');
      const margemX = 12;
      const larguraPagina = doc.internal.pageSize.getWidth();
      const alturaPagina = doc.internal.pageSize.getHeight();
      const limiteInferior = alturaPagina - 18.5;
      const gapColuna = 4;
      const larguraUtil = larguraPagina - (margemX * 2);
      const larguraColuna = (larguraUtil - gapColuna) / 2;

      modelos.forEach((modelo, indiceModelo) => {
        if (indiceModelo > 0) doc.addPage();

        let y = desenharCabecalhoClinico(doc, { modelo, logo, margemX });
        const grupos = agruparPerguntasClinicas(modelo.perguntas || []);

        if (!grupos.length) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...CORES.cinza500);
          doc.text('Nenhuma resposta registrada.', margemX, y + 4);
          return;
        }

        grupos.forEach((grupo) => {
          const duasColunas = grupo.length === 2;
          const larguraPrimeira = duasColunas ? larguraColuna : (grupo[0].ampla ? larguraUtil : larguraColuna);
          const alturaPrimeira = medirPerguntaClinica(doc, grupo[0], larguraPrimeira);
          const alturaSegunda = duasColunas ? medirPerguntaClinica(doc, grupo[1], larguraColuna) : 0;
          const alturaGrupo = Math.max(alturaPrimeira, alturaSegunda);
          const perguntaLonga = !duasColunas && grupo[0].ampla &&
            (grupo[0].tipo === 'texto_livre' || !Array.isArray(grupo[0].opcoes) || !grupo[0].opcoes.length) &&
            alturaGrupo > (limiteInferior - 47);

          const novaPagina = () => {
            doc.addPage();
            return desenharCabecalhoClinico(doc, { modelo, logo, continuacao: true, margemX });
          };

          if (perguntaLonga) {
            y = desenharPerguntaTextoPaginada(doc, grupo[0], {
              x: margemX,
              y,
              largura: larguraPrimeira,
              limiteInferior,
              novaPagina
            });
            return;
          }

          if (y + alturaGrupo > limiteInferior) {
            y = novaPagina();
          }

          desenharPerguntaClinica(doc, grupo[0], {
            x: margemX,
            y,
            largura: larguraPrimeira,
            altura: alturaGrupo
          });

          if (duasColunas) {
            desenharPerguntaClinica(doc, grupo[1], {
              x: margemX + larguraColuna + gapColuna,
              y,
              largura: larguraColuna,
              altura: alturaGrupo
            });
          }

          y += alturaGrupo + 4;
        });
      });

      adicionarRodapesClinicos(doc, { agora: new Date(), margemX });

      const nomePaciente = String(modelos[0]?.paciente || 'paciente')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
      const prefixo = modelos.length > 1 ? 'comparacao_prontuarios' : 'prontuario';
      const nomeArquivo = `${prefixo}_${nomePaciente || 'paciente'}_${gerarStamp(new Date())}.pdf`;

      if (abrirParaImpressao && janelaImpressao) {
        if (typeof doc.autoPrint === 'function') doc.autoPrint();
        janelaImpressao.location.href = doc.output('bloburl');
      } else {
        if (janelaImpressao && !janelaImpressao.closed) janelaImpressao.close();
        doc.save(nomeArquivo);
      }

      return { doc, nomeArquivo };
    } catch (error) {
      if (janelaImpressao && !janelaImpressao.closed) janelaImpressao.close();
      throw error;
    }
  }

  window.GeradorPdfCAIGE = Object.freeze({
    CORES,
    criarDocumento,
    carregarImagemComoDataUrl,
    desenharCabecalho,
    desenharMetadados,
    desenharIndicadores,
    obterEstilosTabela,
    adicionarRodapes,
    gerarStamp,
    exportarProntuarioClinico
  });
})();
