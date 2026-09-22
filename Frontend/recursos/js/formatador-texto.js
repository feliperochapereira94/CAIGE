/**
 * CAIGE — Utilitário Global de Formatação Semântica de Textos
 *
 * Responsável pela apresentação padronizada de dados estruturados
 * (nomes de pessoas, títulos, endereços e descrições de movimentações).
 *
 * REGRAS DE ARQUITETURA:
 * 1. Não altera dados de banco (atua na camada de apresentação / normalização).
 * 2. Não inventa acentos ausentes na entrada original.
 * 3. Preserva pontuação, números, siglas técnicas e textos livres.
 * 4. Não contém lógica de diagnóstico clínico ou cálculo somatométrico (IMC).
 */
(function () {
  'use strict';

  if (window.FormatadorTexto) {
    return;
  }

  const PARTICULAS_NOME = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const PARTICULAS_TITULO = new Set([
    'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'no', 'na', 'nos', 'nas'
  ]);
  const SIGLAS_UF = new Set([
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]);

  /**
   * Sanitiza espaços múltiplos, tabulações e quebras periféricas.
   * @param {*} valor
   * @returns {string}
   */
  function sanitizarEspacos(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor).replace(/\s+/g, ' ').trim();
  }

  /**
   * Capitaliza um segmento individual preservando apóstrofos e hífens.
   * Não altera acentuação pré-existente.
   * @param {string} seg
   * @returns {string}
   */
  function capitalizarSegmento(seg) {
    if (!seg) return '';

    // Segmentos com apóstrofo (ex.: D'AVILA -> D'Avila)
    if (seg.includes("'") && !seg.startsWith("'") && !seg.endsWith("'")) {
      return seg
        .split("'")
        .map((parte, idx) => {
          if (idx === 0 && parte.length === 1) {
            return parte.toLocaleUpperCase('pt-BR');
          }
          return parte.charAt(0).toLocaleUpperCase('pt-BR') + parte.slice(1).toLocaleLowerCase('pt-BR');
        })
        .join("'");
    }

    // Segmentos com hífen (ex.: MARIA-CLARA -> Maria-Clara)
    if (seg.includes('-') && !seg.startsWith('-') && !seg.endsWith('-')) {
      return seg
        .split('-')
        .map((parte) => capitalizarSegmento(parte))
        .join('-');
    }

    // Punctuação inicial (aspas, parênteses)
    const matchPrefixo = seg.match(/^([^a-zA-ZÀ-ÿ0-9]+)(.*)$/);
    if (matchPrefixo && matchPrefixo[1]) {
      return matchPrefixo[1] + capitalizarSegmento(matchPrefixo[2]);
    }

    return seg.charAt(0).toLocaleUpperCase('pt-BR') + seg.slice(1).toLocaleLowerCase('pt-BR');
  }

  /**
   * Formata nome de pessoa física ou responsável.
   * Partículas intermediárias (de, da, do, das, dos, e) ficam em minúsculas.
   * Agnomes (Júnior, Filho, Neto, Sobrinho) são capitalizados.
   * Sem exceções para siglas institucionais em campos de pessoa (ex.: "Suporte CAIGE" -> "Suporte Caige").
   *
   * @param {*} valor
   * @param {string} [fallback='']
   * @returns {string}
   */
  function formatarNomePessoa(valor, fallback = '') {
    const limpo = sanitizarEspacos(valor);
    if (!limpo) return fallback;

    if (limpo.startsWith('"') && limpo.endsWith('"') && limpo.length > 1) {
      return `"${formatarNomePessoa(limpo.slice(1, -1), fallback)}"`;
    }
    if (limpo.startsWith('“') && limpo.endsWith('”') && limpo.length > 1) {
      return `“${formatarNomePessoa(limpo.slice(1, -1), fallback)}”`;
    }

    const palavras = limpo.split(' ');
    const resultado = palavras.map((palavra, index) => {
      const lower = palavra.toLocaleLowerCase('pt-BR');
      if (index > 0 && PARTICULAS_NOME.has(lower)) {
        return lower;
      }
      return capitalizarSegmento(palavra);
    });

    return resultado.join(' ');
  }

  /**
   * Formata títulos de cursos, atividades, questionários e termos institucionais.
   * @param {*} valor
   * @param {string} [fallback='']
   * @returns {string}
   */
  function formatarTitulo(valor, fallback = '') {
    const limpo = sanitizarEspacos(valor);
    if (!limpo) return fallback;

    const palavras = limpo.split(' ');
    const resultado = palavras.map((palavra, index) => {
      const lower = palavra.toLocaleLowerCase('pt-BR');
      if (index > 0 && PARTICULAS_TITULO.has(lower)) {
        return lower;
      }
      return capitalizarSegmento(palavra);
    });

    return resultado.join(' ');
  }

  /**
   * Formata sigla ou nome de Unidade Federativa (UF).
   * Se tiver 2 caracteres, preserva em maiúsculas (MG, SP, RJ).
   * @param {*} valor
   * @returns {string}
   */
  function formatarEstado(valor) {
    const limpo = sanitizarEspacos(valor);
    if (!limpo) return '';
    if (limpo.length === 2) {
      return limpo.toLocaleUpperCase('pt-BR');
    }
    return formatarTitulo(limpo);
  }

  function ehSiglaUF(valor) {
    const limpo = sanitizarEspacos(valor).toLocaleUpperCase('pt-BR');
    return SIGLAS_UF.has(limpo);
  }

  function formatarValorApresentacao(valor, fallback = '') {
    const limpo = sanitizarEspacos(valor);
    if (!limpo) return fallback;
    return capitalizarSegmento(limpo);
  }

  /**
   * Formata um endereço individual ou composto.
   * Aceita objeto estruturado { rua, numero, bairro, cidade, estado, cep } ou string.
   * @param {Object|string} dados
   * @returns {string}
   */
  function formatarEndereco(dados) {
    if (!dados) return '';

    if (typeof dados === 'string') {
      const limpo = sanitizarEspacos(dados);
      if (!limpo) return '';
      return limpo
        .split(',')
        .map((segmento) => {
          const segTrim = sanitizarEspacos(segmento);
          if (!segTrim) return '';
          if (ehSiglaUF(segTrim)) {
            return formatarEstado(segTrim);
          }
          if (segTrim.includes('-')) {
            return segTrim
              .split('-')
              .map((p) => {
                const sub = sanitizarEspacos(p);
                if (sub.includes('/')) {
                  const [cidade, uf] = sub.split('/');
                  return `${formatarTitulo(cidade)}/${formatarEstado(uf)}`;
                }
                if (ehSiglaUF(sub)) {
                  return formatarEstado(sub);
                }
                return formatarTitulo(sub);
              })
              .join(' - ');
          }
          if (segTrim.includes('/')) {
            const [cidade, uf] = segTrim.split('/');
            return `${formatarTitulo(cidade)}/${formatarEstado(uf)}`;
          }
          return formatarTitulo(segTrim);
        })
        .join(', ');
    }

    if (typeof dados === 'object') {
      const rua = formatarTitulo(dados.rua || dados.street || '');
      const numero = sanitizarEspacos(dados.numero || dados.number || '');
      const bairro = formatarTitulo(dados.bairro || dados.neighborhood || '');
      const cidade = formatarTitulo(dados.cidade || dados.city || '');
      const estado = formatarEstado(dados.estado || dados.state || '');
      const cep = sanitizarEspacos(dados.cep || '');

      let base = rua;
      if (numero) {
        base = base ? `${base}, ${numero}` : numero;
      }
      if (bairro) {
        base = base ? `${base} - ${bairro}` : bairro;
      }
      if (cidade) {
        base = base ? `${base}, ${cidade}` : cidade;
      }
      if (estado) {
        base = base ? `${base}/${estado}` : estado;
      }
      if (cep) {
        base = base ? `${base}, CEP ${cep}` : `CEP ${cep}`;
      }
      return base;
    }

    return sanitizarEspacos(dados);
  }

  /**
   * Normaliza o tipo de movimentação para uma categoria curta e estável.
   * A ação específica permanece em Detalhes; o badge representa apenas a categoria.
   * Ex.: "Período letivo criado" -> "Período letivo".
   *
   * @param {*} tipo
   * @returns {string}
   */
  function formatarTipoMovimentacao(tipo) {
    const limpo = sanitizarEspacos(tipo);
    if (!limpo) return 'Movimentação';

    const normalizado = limpo
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalizado.includes('frequencia') || normalizado.includes('presenca')) {
      return 'Frequência';
    }

    if (normalizado.includes('avaliacao') || normalizado.includes('prontuario')) {
      return 'Avaliação';
    }

    if (normalizado.includes('periodo letivo') || normalizado.includes('periodo_letivo')) {
      return 'Período letivo';
    }

    if (normalizado.includes('paciente')) {
      return 'Paciente';
    }

    if (normalizado.includes('atividade')) {
      return 'Atividade';
    }

    if (normalizado.includes('curso')) {
      return 'Curso';
    }

    if (normalizado.includes('usuario')) {
      return 'Usuário';
    }

    return limpo;
  }

  function obterClasseTipoMovimentacao(tipo) {
    const rotulo = formatarTipoMovimentacao(tipo);
    const classes = {
      'Paciente cadastrado': 'cadastro',
      'Paciente': 'cadastro',
      'Frequência': 'frequencia',
      'Avaliação': 'avaliacao',
      'Atividade': 'cadastro',
      'Curso': 'cadastro',
      'Período letivo': 'cadastro',
      'Usuário': 'edicao'
    };
    return classes[rotulo] || 'sistema';
  }

  /**
   * Formata descrições de movimentações do sistema e do painel.
   * Mantém a estrutura sintática natural da frase sem forçar Title Case na frase inteira.
   * Preserva citações, siglas médicas e padrões desconhecidos.
   *
   * @param {*} descricao
   * @returns {string}
   */
  function formatarDescricaoMovimentacao(descricao) {
    const limpo = sanitizarEspacos(descricao);
    if (!limpo) return '';

    // 1. "Paciente [NOME] cadastrado/atualizado/inativado/arquivado/recuperado/ocultado..."
    const regexPacienteAcao = /^Paciente\s+(.+?)\s+(cadastrado|cadastrada|atualizado|atualizada|desativado|desativada|inativado|inativada|ativado|ativada|reativado|reativada|arquivado|arquivada|recuperado|recuperada|ocultado|ocultada|removido|removida|excluído|excluída|restaurado|restaurada)(.*)$/i;
    const match1 = limpo.match(regexPacienteAcao);
    if (match1) {
      const nomeFormatado = formatarNomePessoa(match1[1]);
      const acao = match1[2].toLocaleLowerCase('pt-BR');
      const resto = match1[3] || '';
      return `Paciente ${nomeFormatado} ${acao}${resto}`;
    }

    // 1b. "Presença do paciente [NOME] registrada..."
    const regexPresenca = /^Presença do paciente\s+(.+?)\s+(registrada|removida|atualizada)(.*)$/i;
    const matchPresenca = limpo.match(regexPresenca);
    if (matchPresenca) {
      const nomeFormatado = formatarNomePessoa(matchPresenca[1]);
      const acao = matchPresenca[2].toLocaleLowerCase('pt-BR');
      const resto = matchPresenca[3] || '';
      return `Presença do paciente ${nomeFormatado} ${acao}${resto}`;
    }

    // 1c. "Prontuário de [NOME] criado/atualizado por [AUTOR]"
    const regexProntuarioCriado = /^Prontuário de\s+(.+?)\s+(criado|atualizado|registrado)\s+por\s+(.+)$/i;
    const matchProntuario = limpo.match(regexProntuarioCriado);
    if (matchProntuario) {
      const pacienteFormatado = formatarNomePessoa(matchProntuario[1]);
      const acao = matchProntuario[2].toLocaleLowerCase('pt-BR');
      const autorFormatado = formatarNomePessoa(matchProntuario[3]);
      return `Prontuário de ${pacienteFormatado} ${acao} por ${autorFormatado}`;
    }

    // 2. "Novo paciente cadastrado: [NOME] (CPF: ...)"
    const regexNovoPaciente = /^Novo paciente cadastrado:\s+(.+?)(\s+\(CPF:.*?\))?$/i;
    const match2 = limpo.match(regexNovoPaciente);
    if (match2) {
      const nomeFormatado = formatarNomePessoa(match2[1]);
      const cpf = match2[2] || '';
      return `Novo paciente cadastrado: ${nomeFormatado}${cpf}`;
    }

    // 3. "[Paciente] participou de [Atividade]"
    const regexParticipou = /^(.+?)\s+participou de\s+(.+)$/i;
    const match3 = limpo.match(regexParticipou);
    if (match3) {
      const nomeFormatado = formatarNomePessoa(match3[1]);
      const atividadeFormatada = formatarTitulo(match3[2]);
      return `${nomeFormatado} participou de ${atividadeFormatada}`;
    }

    // 4. "[Atividade] cadastrada no curso [Curso]"
    const regexCadastradaCurso = /^(.+?)\s+cadastrada no curso\s+(.+)$/i;
    const match4 = limpo.match(regexCadastradaCurso);
    if (match4) {
      const ativFormatada = formatarTitulo(match4[1]);
      const cursoFormatado = formatarTitulo(match4[2]);
      return `${ativFormatada} cadastrada no curso ${cursoFormatado}`;
    }

    // 5. 'Avaliação "[Titulo]" realizada para [Paciente]'
    const regexAvaliacao = /^Avaliação\s+"(.*?)"\s+realizada para\s+(.+)$/i;
    const match5 = limpo.match(regexAvaliacao);
    if (match5) {
      const titulo = match5[1]; // Preserva título da avaliação entre aspas
      const pacienteFormatado = formatarNomePessoa(match5[2]);
      return `Avaliação "${titulo}" realizada para ${pacienteFormatado}`;
    }

    // Padrão não reconhecido ou texto livre: preservar original sem alterações
    return limpo;
  }

  window.FormatadorTexto = Object.freeze({
    sanitizarEspacos,
    formatarNomePessoa,
    formatarTitulo,
    formatarEstado,
    formatarValorApresentacao,
    formatarEndereco,
    formatarTipoMovimentacao,
    obterClasseTipoMovimentacao,
    formatarDescricaoMovimentacao
  });
})();
