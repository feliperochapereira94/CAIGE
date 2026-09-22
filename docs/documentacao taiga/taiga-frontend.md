# Taiga sem importação CSV --- FRONTEND

Este arquivo é um **roteiro interno da equipe** para cadastrar e
executar as histórias do épico FRONTEND no Taiga.

A organização abaixo mantém a evolução em 4 sprints. Em cada tarefa
técnica foi incluído o **arquivo que o programador deve pegar do projeto
base** e, depois da implementação, **subir no Git somente se tiver sido
alterado**.

> Regra de Git: não subir a pasta inteira do Frontend por tarefa. O
> programador deve versionar somente os arquivos efetivamente
> modificados naquela tarefa.

## Estrutura do projeto no Taiga

1.  Crie/mantenha os épicos:
    -   BACKEND
    -   FRONTEND
    -   BANCO DE DADOS
2.  Neste roteiro, alimente apenas o épico **FRONTEND**.
3.  Cadastre a história com o nome indicado em **Nome da história no
    Taiga**.
4.  Cole a história de usuário e os critérios de aceite na descrição.
5.  Cadastre cada item de **Tarefas no Taiga** como uma tarefa técnica
    separada.
6.  O caminho mostrado em **Arquivo(s) para pegar / subir no Git** é a
    referência atual da V1.

------------------------------------------------------------------------

# Sprint 1 --- Acesso, navegação e painel

## US-01 --- Tela de login e autenticação

**Nome da história no Taiga:** `US-01 — Tela de login e autenticação`\
**Epic:** FRONTEND\
**Sprint:** Sprint 1\
**Story Points:** 3\
**Prioridade:** Alta

**História:** Como usuário do sistema, quero acessar a tela de login e
autenticar minha sessão, para entrar no sistema com segurança.

### Critérios de aceite

-   Credenciais válidas permitem entrar no sistema.
-   Credenciais inválidas exibem feedback de erro.
-   A sessão autenticada é reconhecida nas páginas protegidas.
-   Token ausente ou expirado direciona o usuário para o login.

### Tarefas no Taiga

  ---------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- ---------------------------------------------
  Criar estrutura visual da tela de   `Frontend/paginas/autenticacao/entrar.html`
  login                               

  Implementar estilos da tela de      `Frontend/recursos/css/paginas/login.css`
  login                               

  Implementar envio das credenciais e `Frontend/recursos/js/login.js`
  tratamento do login                 

  Implementar leitura, validação e    `Frontend/recursos/js/util-jwt.js`
  limpeza do JWT                      

  Validar entrada inicial e           `Frontend/index.html`
  redirecionamento da aplicação       
  ---------------------------------------------------------------------------------

------------------------------------------------------------------------

## US-02 --- Navegação principal e identidade do usuário

**Nome da história no Taiga:**
`US-02 — Navegação principal e identidade do usuário`\
**Epic:** FRONTEND\
**Sprint:** Sprint 1\
**Story Points:** 3\
**Prioridade:** Alta

**História:** Como usuário logado, quero visualizar a navegação
principal e minha identidade, para acessar somente as áreas permitidas
ao meu perfil.

### Critérios de aceite

-   O menu apresenta as opções adequadas ao perfil.
-   Nome e papel do usuário são apresentados corretamente.
-   Professor e Supervisor recebem acessos compatíveis com suas
    permissões.
-   A navegação funciona em desktop, tablet e celular.

### Tarefas no Taiga

  -------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- -------------------------------------------
  Montar shell e navegação global     `Frontend/recursos/js/shell-global.js`

  Implementar menu lateral            `Frontend/recursos/js/sidebar-menu.js`

  Implementar menu do avatar e dados  `Frontend/recursos/js/menu-usuario.js`
  do usuário                          

  Aplicar regras visuais de acesso    `Frontend/recursos/js/controle-acesso.js`
  por perfil                          

  Disponibilizar ícones               `Frontend/recursos/js/icones.js`
  compartilhados da navegação         

  Estruturar layout compartilhado     `Frontend/recursos/css/layout.css`

  Ajustar comportamento responsivo da `Frontend/recursos/css/responsive.css`
  navegação                           
  -------------------------------------------------------------------------------

------------------------------------------------------------------------

## US-03 --- Painel inicial com resumo do sistema

**Nome da história no Taiga:**
`US-03 — Painel inicial com resumo do sistema`\
**Epic:** FRONTEND\
**Sprint:** Sprint 1\
**Story Points:** 3\
**Prioridade:** Alta

**História:** Como usuário logado, quero visualizar um painel com
indicadores e movimentações relevantes, para acompanhar rapidamente o
ambiente do CAIGE.

### Critérios de aceite

-   O painel apresenta os indicadores disponíveis para o usuário.
-   Os dados carregados da API são exibidos sem quebrar a interface.
-   Estados vazios são tratados adequadamente.
-   O Professor visualiza somente o contexto permitido ao seu curso.

### Tarefas no Taiga

  -----------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- -----------------------------------------------
  Estruturar a tela do painel         `Frontend/paginas/painel/painel.html`

  Implementar estilos e cards do      `Frontend/recursos/css/paginas/dashboard.css`
  painel                              

  Implementar comportamento do painel `Frontend/recursos/js/painel-retratil.js`
  retrátil                            

  Ajustar redimensionamento dos       `Frontend/recursos/js/redimensionar-grid.js`
  componentes do painel               

  Aplicar formatação padronizada aos  `Frontend/recursos/js/formatador-texto.js`
  dados exibidos                      
  -----------------------------------------------------------------------------------

------------------------------------------------------------------------

# Sprint 2 --- Pacientes e prontuários

## US-04 --- Cadastro, listagem e visualização de pacientes

**Nome da história no Taiga:**
`US-04 — Cadastro, listagem e visualização de pacientes`\
**Epic:** FRONTEND\
**Sprint:** Sprint 2\
**Story Points:** 5\
**Prioridade:** Alta

**História:** Como profissional do sistema, quero cadastrar, pesquisar,
visualizar e editar pacientes, para manter os dados cadastrais
organizados.

### Critérios de aceite

-   O usuário consegue pesquisar e listar pacientes.
-   O cadastro valida os campos necessários.
-   A visualização apresenta os dados do paciente.
-   A edição preserva e atualiza corretamente os dados existentes.
-   As ações disponíveis respeitam as permissões do usuário.

### Tarefas no Taiga

  ------------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- ------------------------------------------------
  Implementar listagem e pesquisa de  `Frontend/paginas/pacientes/lista.html` +
  pacientes                           `Frontend/recursos/js/pacientes-lista.js`

  Implementar cadastro de paciente    `Frontend/paginas/pacientes/novo.html` +
                                      `Frontend/recursos/js/paciente-form-utils.js`

  Implementar visualização do         `Frontend/paginas/pacientes/visualizar.html` +
  paciente                            `Frontend/recursos/js/paciente-form-utils.js`

  Implementar edição do paciente      `Frontend/paginas/pacientes/editar.html` +
                                      `Frontend/recursos/js/paciente-form-utils.js`

  Padronizar estilos das telas de     `Frontend/recursos/css/paginas/pacientes.css`
  pacientes                           

  Implementar menu de ações dos       `Frontend/recursos/js/menu-acoes.js`
  registros                           

  Implementar paginação da listagem   `Frontend/recursos/js/paginacao.js`
  ------------------------------------------------------------------------------------

------------------------------------------------------------------------

## US-05 --- Prontuário e questionários do paciente

**Nome da história no Taiga:**
`US-05 — Prontuário e questionários do paciente`\
**Epic:** FRONTEND\
**Sprint:** Sprint 2\
**Story Points:** 5\
**Prioridade:** Alta

**História:** Como profissional, quero acessar o prontuário
interdisciplinar e os questionários do paciente, para registrar e
consultar informações dos atendimentos.

### Critérios de aceite

-   O prontuário apresenta o histórico do paciente.
-   O usuário consegue visualizar os documentos permitidos.
-   Os questionários apresentam perguntas e respostas corretamente.
-   As informações respeitam curso, profissional e permissões.
-   A impressão do prontuário mantém apresentação legível.

### Tarefas no Taiga

  -----------------------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- -----------------------------------------------------------
  Implementar tela principal do       `Frontend/paginas/pacientes/prontuario.html` +
  prontuário                          `Frontend/recursos/js/paciente-prontuario.js`

  Implementar listagem/cadastro de    `Frontend/paginas/pacientes/questionarios.html` +
  perguntas                           `Frontend/recursos/js/configurador-tipo-pergunta.js`

  Implementar histórico e detalhes    `Frontend/paginas/pacientes/questionario-detalhes.html`
  dos lançamentos                     

  Implementar gerenciamento           `Frontend/recursos/js/gerenciador-questionarios.js`
  compartilhado dos questionários     

  Renderizar documento do prontuário  `Frontend/recursos/js/renderizador-prontuario.js`

  Implementar geração/impressão do    `Frontend/recursos/js/gerador-pdf.js`
  documento                           

  Padronizar estilos da área de       `Frontend/recursos/css/paginas/prontuarios.css` +
  prontuários                         `Frontend/recursos/css/paginas/prontuario-paciente.css` +
                                      `Frontend/recursos/css/paginas/prontuario-documento.css`
  -----------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# Sprint 3 --- Frequência e administração

## US-06 --- Registro e relatório de frequência

**Nome da história no Taiga:**
`US-06 — Registro e relatório de frequência`\
**Epic:** FRONTEND\
**Sprint:** Sprint 3\
**Story Points:** 5\
**Prioridade:** Alta

**História:** Como Professor ou Supervisor, quero registrar e consultar
a frequência dos pacientes nas atividades, para acompanhar os
atendimentos realizados.

### Critérios de aceite

-   É possível selecionar um ou mais pacientes.
-   Professor trabalha dentro do curso vinculado; Supervisor utiliza os
    filtros administrativos disponíveis.
-   Curso, atividade e profissional são carregados de acordo com o
    fluxo.
-   O registro não é enviado sem os dados obrigatórios.
-   O relatório permite filtrar e consultar o período.
-   O relatório pode ser exportado no formato disponibilizado pelo
    sistema.

### Tarefas no Taiga

  ---------------------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- ---------------------------------------------------------
  Implementar interface de registro e `Frontend/paginas/frequencia/relatorio-frequencia.html`
  relatório de frequência             

  Implementar seleção, filtros e      `Frontend/recursos/js/gerenciador-frequencia.js`
  registro de frequência              

  Preservar estado de trabalho        `Frontend/recursos/js/estado-sessao.js`
  durante a navegação                 

  Implementar seleção de datas em     `Frontend/recursos/js/date-picker-ptbr.js`
  PT-BR                               

  Implementar exportação do relatório `Frontend/recursos/js/gerador-pdf.js`

  Padronizar estilos de frequência e  `Frontend/recursos/css/paginas/frequencia.css`
  relatório                           
  ---------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## US-07 --- Gestão de cursos, atividades e períodos

**Nome da história no Taiga:**
`US-07 — Gestão de cursos, atividades e períodos`\
**Epic:** FRONTEND\
**Sprint:** Sprint 3\
**Story Points:** 5\
**Prioridade:** Média

**História:** Como Supervisor, quero administrar cursos, atividades e
períodos de frequência, para manter a estrutura acadêmica utilizada pelo
CAIGE.

### Critérios de aceite

-   O Supervisor consegue consultar e manter os cursos disponíveis.
-   Atividades podem ser vinculadas ao curso correspondente.
-   Períodos/calendário de frequência podem ser administrados.
-   O Professor visualiza seu curso e suas atividades conforme o
    vínculo.
-   Operações inválidas apresentam feedback sem quebrar a interface.

### Tarefas no Taiga

  --------------------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- --------------------------------------------------------
  Implementar área administrativa de  `Frontend/paginas/administracao/usuarios.html` +
  cursos                              `Frontend/recursos/js/gerenciador-usuarios.js`

  Implementar gestão de atividades    `Frontend/recursos/js/gerenciador-atividades.js`
  por curso                           

  Implementar períodos e calendário   `Frontend/recursos/js/gerenciador-periodos-letivos.js`
  de frequência                       

  Implementar visualização de Meu     `Frontend/paginas/cursos/meu-curso.html` +
  Curso                               `Frontend/recursos/js/meu-curso.js`

  Padronizar estilos da tela Meu      `Frontend/recursos/css/paginas/cursos.css`
  Curso                               
  --------------------------------------------------------------------------------------------

> Observação interna: na V1 atual não existem
> `Frontend/paginas/administracao/cursos.html` nem
> `Frontend/recursos/js/gerenciador-cursos.js`. A gestão administrativa
> de cursos está integrada ao módulo de administração/usuários e aos
> gerenciadores atuais. Não usar os caminhos antigos.

------------------------------------------------------------------------

## US-08 --- Gestão de usuários e permissões

**Nome da história no Taiga:**
`US-08 — Gestão de usuários e permissões`\
**Epic:** FRONTEND\
**Sprint:** Sprint 3\
**Story Points:** 5\
**Prioridade:** Alta

**História:** Como Supervisor, quero gerenciar usuários, papéis e
vínculos com cursos, para controlar o acesso ao sistema.

### Critérios de aceite

-   O Supervisor consegue listar usuários.
-   É possível cadastrar e editar os dados permitidos.
-   Papel e curso são apresentados corretamente.
-   Ações de ativação/inativação respeitam as regras disponíveis.
-   O usuário comum não recebe acesso às funções administrativas.

### Tarefas no Taiga

  ------------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- ------------------------------------------------
  Estruturar tela de gerenciamento de `Frontend/paginas/administracao/usuarios.html`
  usuários                            

  Implementar cadastro, edição e      `Frontend/recursos/js/gerenciador-usuarios.js`
  ações de usuários                   

  Aplicar controle visual de acesso   `Frontend/recursos/js/controle-acesso.js`
  às funções administrativas          

  Implementar confirmações das ações  `Frontend/recursos/js/modal-confirmacao.js`
  administrativas                     

  Implementar notificações de         `Frontend/recursos/js/notificacoes.js`
  sucesso, aviso e erro               

  Padronizar estilos da administração `Frontend/recursos/css/paginas/usuarios.css`
  de usuários                         
  ------------------------------------------------------------------------------------

------------------------------------------------------------------------

# Sprint 4 --- Movimentações, auditoria e refinamento visual

## US-09 --- Movimentações e auditoria

**Nome da história no Taiga:** `US-09 — Movimentações e auditoria`\
**Epic:** FRONTEND\
**Sprint:** Sprint 4\
**Story Points:** 3\
**Prioridade:** Média

**História:** Como Supervisor, quero consultar movimentações e eventos
de auditoria, para acompanhar as ações realizadas no sistema.

### Critérios de aceite

-   A tela apresenta os registros de movimentação de forma legível.
-   Data, usuário, tipo e descrição são apresentados corretamente.
-   Filtros e paginação funcionam sem desalinhamento.
-   Estado vazio é tratado adequadamente.
-   A apresentação permanece utilizável também no mobile.

### Tarefas no Taiga

  ---------------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- ---------------------------------------------------
  Estruturar tela de movimentações e  `Frontend/paginas/atividades/atividades.html`
  auditoria                           

  Implementar filtros de data         `Frontend/recursos/js/date-picker-ptbr.js`

  Implementar paginação dos eventos   `Frontend/recursos/js/paginacao.js`

  Padronizar textos exibidos nos      `Frontend/recursos/js/formatador-texto.js`
  eventos                             

  Implementar estilos da tela de      `Frontend/recursos/css/paginas/movimentacoes.css`
  movimentações                       
  ---------------------------------------------------------------------------------------

------------------------------------------------------------------------

## US-10 --- Responsividade e consistência visual

**Nome da história no Taiga:**
`US-10 — Responsividade e consistência visual`\
**Epic:** FRONTEND\
**Sprint:** Sprint 4\
**Story Points:** 5\
**Prioridade:** Média

**História:** Como usuário do sistema, quero uma interface consistente e
responsiva, para utilizar o CAIGE em desktop, tablet e celular com boa
legibilidade e navegação.

### Critérios de aceite

-   As telas seguem o mesmo padrão visual.
-   Desktop mantém proporção e alinhamento adequados.
-   Tablet e celular não apresentam overflow horizontal indevido.
-   Navegação móvel permanece acessível.
-   Cards, formulários, tabelas, modais e mensagens seguem componentes
    compartilhados.
-   Impressão e visualizações específicas permanecem legíveis.

### Tarefas no Taiga

  ---------------------------------------------------------------------------------
  Nome da tarefa                      Arquivo(s) para pegar / subir no Git
  ----------------------------------- ---------------------------------------------
  Consolidar tokens e estilos base    `Frontend/recursos/css/base.css`

  Padronizar componentes              `Frontend/recursos/css/componentes.css`
  reutilizáveis                       

  Padronizar estrutura e espaçamentos `Frontend/recursos/css/layout.css`
  globais                             

  Implementar responsividade global   `Frontend/recursos/css/responsive.css`

  Padronizar navegação responsiva     `Frontend/recursos/js/shell-global.js` +
                                      `Frontend/recursos/js/sidebar-menu.js`

  Padronizar biblioteca de ícones     `Frontend/recursos/js/icones.js`

  Padronizar textos da interface      `Frontend/recursos/js/text-normalizer.js` +
                                      `Frontend/recursos/js/formatador-texto.js`

  Revisar feedback e confirmações     `Frontend/recursos/js/notificacoes.js` +
  compartilhadas                      `Frontend/recursos/js/modal-confirmacao.js`

  Validar CSS específico de cada      `Frontend/recursos/css/paginas/` --- subir
  módulo                              somente os CSS realmente alterados
  ---------------------------------------------------------------------------------

------------------------------------------------------------------------

# Distribuição das histórias

  -----------------------------------------------------------------------
  Sprint                  Histórias               Objetivo visual da
                                                  evolução
  ----------------------- ----------------------- -----------------------
  Sprint 1                US-01, US-02, US-03     Entrada no sistema,
                                                  navegação e painel

  Sprint 2                US-04, US-05            Pacientes, prontuário e
                                                  questionários

  Sprint 3                US-06, US-07, US-08     Frequência e
                                                  administração

  Sprint 4                US-09, US-10            Movimentações,
                                                  auditoria,
                                                  responsividade e
                                                  acabamento
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Regra prática para o programador

Para cada tarefa:

1.  Ler a **história** e os **critérios de aceite** no Taiga.
2.  Pegar do repositório base somente os arquivos indicados na tarefa.
3.  Implementar a tarefa sem alterar módulos fora do escopo.
4.  Testar a tela/fluxo correspondente.
5.  Conferir `git status`.
6.  Adicionar ao commit **somente os arquivos realmente alterados**.
7.  Fazer commit com mensagem relacionada à história/tarefa.
8.  Fazer push na branch definida pela equipe.
9.  Anexar no Taiga a evidência solicitada (print, vídeo ou resultado de
    teste).
10. Mover a tarefa conforme o fluxo adotado pela equipe.

## Exemplo

**História no Taiga:**
`US-04 — Cadastro, listagem e visualização de pacientes`

**Tarefa:** `Implementar listagem e pesquisa de pacientes`

**Programador pega:** - `Frontend/paginas/pacientes/lista.html` -
`Frontend/recursos/js/pacientes-lista.js`

**Ao subir no Git:** se somente `pacientes-lista.js` tiver sido
alterado, subir somente esse arquivo. O fato de `lista.html` estar
indicado como referência não obriga a modificá-lo.

------------------------------------------------------------------------

# Observação estratégica interna

Este documento é de uso da equipe para organizar o trabalho no Taiga. A
divisão em sprints deve apresentar uma evolução progressiva do frontend:
primeiro acesso e navegação, depois pacientes/prontuários, em seguida
frequência/administração e, por último, auditoria e refinamento visual.

O documento não deve ser utilizado como documentação pública da V1 nem
enviado como roteiro interno ao repositório destinado ao professor.

## Caminhos antigos removidos desta versão do roteiro

Os seguintes caminhos apareciam no planejamento anterior, mas **não
existem na estrutura atual da V1** e não devem mais ser usados nas
tarefas:

-   `Frontend/paginas/autenticacao/login.html` → atual:
    `Frontend/paginas/autenticacao/entrar.html`
-   `Frontend/paginas/painel/dashboard.html` → atual:
    `Frontend/paginas/painel/painel.html`
-   `Frontend/recursos/js/dashboard.js` → não existe na estrutura atual
-   `Frontend/recursos/js/menu.js` → substituído pela estrutura atual de
    `shell-global.js`, `sidebar-menu.js` e `menu-usuario.js`
-   `Frontend/paginas/pacientes/pacientes.html` → atual:
    `Frontend/paginas/pacientes/lista.html`
-   `Frontend/paginas/pacientes/prontuarios.html` → atual:
    `Frontend/paginas/pacientes/prontuario.html`
-   `Frontend/paginas/frequencia/frequencia.html` → atual:
    `Frontend/paginas/frequencia/relatorio-frequencia.html`
-   `Frontend/paginas/administracao/cursos.html` → não existe como
    página separada na V1 atual
-   `Frontend/recursos/js/gerenciador-cursos.js` → não existe na V1
    atual
