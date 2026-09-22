
> **Padrão de listagens:** no desktop, registros repetitivos devem reutilizar `data-table`/`data-grid` globais; no mobile podem se reorganizar em cards responsivos. Não criar grid, menu `⋮`, paginação ou aparência paralela quando houver componente global.

# PROMPT MESTRE PARA IA - CAIGE

Use este texto no inicio de uma nova conversa quando a IA tiver acesso ao projeto.

---

Voce esta trabalhando no projeto CAIGE.

Antes de propor ou alterar codigo:

1. Leia `DESIGN_SYSTEM.md`.
2. Leia `REGRAS_PROJETO.md`.
3. Inspecione os arquivos reais relacionados a tarefa.
4. Procure componentes e comportamentos globais existentes antes de criar qualquer regra nova.
5. Nao assuma que uma tela legada representa o padrao oficial.
6. Considere `base.css`, `layout.css`, `componentes.css` e `responsive.css` como a fundacao oficial.
7. CSS de `paginas/*.css` deve conter apenas particularidades reais da pagina.
8. Nao crie nova implementacao de grid, paginacao, resize de coluna, menu de acoes, notificacoes ou outros componentes que ja existam globalmente.
9. Nao use CSS inline nem carregue Google Fonts individualmente em HTML.
10. Nao adicione `!important` como correcao rapida.
11. Codigo novo proprio do projeto deve usar PT-BR quando tecnicamente aplicavel.

Antes de implementar, responda primeiro com:

- o problema identificado;
- quais arquivos serao alterados;
- quais componentes globais existentes serao reutilizados;
- se a alteracao e global ou especifica;
- riscos de impacto em outras telas.

Depois, aguarde autorizacao explicita para gerar as alteracoes.

Antes de criar uma nova lista, classifique o conteudo como:

- TABULAR SEMANTICO;
- OPERACIONAL TABULAR;
- LISTA DE ENTIDADES.

Nao criar tabela custom nova, grid custom novo ou card-list diferente sem verificar os padroes existentes.

Ao concluir:

- valide a sintaxe dos arquivos JavaScript alterados com `node --check <arquivo>`;
- quando a mudanca afetar comportamento visual ou funcional, teste a tela/fluxo correspondente nos perfis envolvidos;
- informe os avisos novos causados pela alteracao;
- nao declare que algo esta padronizado se a validacao ou o codigo mostrar excecoes.

Regra adicional obrigatoria:

- antes de criar sidebar, header, menu do usuario ou quick-nav em qualquer pagina autenticada, verifique o Shell Global;
- e proibido criar uma segunda sidebar/header local em pagina autenticada;
- se uma mudanca exigir comportamento compartilhado, evolua `shell-global.js` ou o modulo responsavel;
- nao use override local como atalho.

Regra obrigatoria para contrato da API:

- antes de concluir qualquer tarefa que altere API, verifique se o contrato observavel mudou;
- contrato da API significa metodo, path, parametro, query, body, resposta, status HTTP, autenticacao, permissao ou regra de escopo entre cliente/frontend e backend;
- se o contrato mudou, atualize `docs/api/openapi.yaml`;
- respostas de erro novas devem usar o padrao `{ "message": "..." }`;
- valide o YAML/OpenAPI antes de concluir;
- informe no relatorio quais endpoints foram atualizados;
- refatoracao interna que nao altera contrato nao exige necessariamente mudanca no OpenAPI.


Regra obrigatoria para PWA e uploads:

- nunca adicione `/api/` ou `/recursos/uploads/` ao cache do Service Worker;
- preserve `Frontend/manifest.webmanifest`, `Frontend/service-worker.js` e `Frontend/recursos/js/pwa.js` como fluxo canônico da PWA;
- fotos de pacientes devem reutilizar `paciente-foto-editor.js` e os endpoints `/api/pacientes/{id}/foto`; não crie armazenamento paralelo no frontend.

Regra de documentacao:

- se a tarefa alterar comportamento, contrato, permissao, schema, PWA ou padrao visual documentado, atualize a documentacao correspondente no mesmo ciclo;
- PDFs tecnicos sao derivados das fontes Markdown e devem ser regenerados quando o conteudo-fonte mudar de forma relevante.

Regra principal:

> Se duas telas precisam da mesma coisa, essa coisa nao pertence a tela.

- O mesmo recurso funcional exibido para perfis diferentes deve reutilizar o mesmo componente visual global; diferenças entre Supervisor e Professor ficam restritas a permissões, escopo e ações autorizadas, não a uma segunda apresentação visual.
