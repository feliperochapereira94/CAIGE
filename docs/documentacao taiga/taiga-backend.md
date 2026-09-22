# Taiga sem importação CSV

Este arquivo foi preparado para uso no Taiga quando a importação CSV não estiver disponível.

## Estrutura do projeto no Taiga

1. Crie os épicos:

- BACKEND
- FRONTEND
- BANCO DE DADOS

2. Neste momento, alimente apenas o épico BACKEND.
3. Em cada história, cole os critérios de aceite na descrição.
4. Em seguida, crie as tarefas técnicas dentro da própria história.

## Onde os desenvolvedores devem pegar os arquivos

### Login e autenticação

- [Backend/src/routes/autenticacao.js](Backend/src/routes/autenticacao.js)
- [Backend/src/controllers/autenticacaoController.js](Backend/src/controllers/autenticacaoController.js)
- [Backend/src/controllers/acessoController.js](Backend/src/controllers/acessoController.js)

### Cadastro e manutenção de pacientes

- [Backend/src/routes/pacientes.js](Backend/src/routes/pacientes.js)
- [Backend/src/controllers/pacientesController.js](Backend/src/controllers/pacientesController.js)
- [Backend/src/models/validacaoModel.js](Backend/src/models/validacaoModel.js)
- [Backend/src/models/database.js](Backend/src/models/database.js)

### Usuários e permissões

- [Backend/src/routes/usuarios.js](Backend/src/routes/usuarios.js)
- [Backend/src/controllers/usuariosController.js](Backend/src/controllers/usuariosController.js)
- [Backend/src/controllers/acessoController.js](Backend/src/controllers/acessoController.js)

### Cursos, atividades e painel

- [Backend/src/routes/cursos.js](Backend/src/routes/cursos.js)
- [Backend/src/controllers/cursosController.js](Backend/src/controllers/cursosController.js)
- [Backend/src/routes/atividades.js](Backend/src/routes/atividades.js)
- [Backend/src/controllers/atividadesController.js](Backend/src/controllers/atividadesController.js)
- [Backend/src/models/registroAtividadeModel.js](Backend/src/models/registroAtividadeModel.js)
- [Backend/src/routes/dados-painel.js](Backend/src/routes/dados-painel.js)
- [Backend/src/controllers/dadosPainelController.js](Backend/src/controllers/dadosPainelController.js)

### Questionários, frequência e arquivos

- [Backend/src/routes/questionarios.js](Backend/src/routes/questionarios.js)
- [Backend/src/controllers/questionariosController.js](Backend/src/controllers/questionariosController.js)
- [Backend/src/routes/frequencia.js](Backend/src/routes/frequencia.js)
- [Backend/src/controllers/frequenciaController.js](Backend/src/controllers/frequenciaController.js)
- [Backend/src/routes/arquivo.js](Backend/src/routes/arquivo.js)
- [Backend/src/controllers/arquivoController.js](Backend/src/controllers/arquivoController.js)

## Histórias de usuário do BACKEND

### US-01 - Login com JWT

Epic: BACKEND  Sprint: Sprint 1  Story Points: 3  Prioridade: Alta

Como usuário autenticável, quero receber token JWT no login, para acessar rotas protegidas.

Descrição detalhada: Esta história cobre a base de autenticação da API, garantindo que o processo de login seja seguro, previsível e padronizado para o frontend. O objetivo é validar credenciais, emitir token com expiração e retornar dados mínimos necessários para manter a sessão ativa.

Critérios de aceite:

- Dado credenciais válidas quando chamar a rota de login então retorna token JWT e expiração.
- Dado credenciais inválidas quando chamar a rota de login então retorna 401.

Tarefas técnicas:

- Ajustar rota POST /api/autenticacao/entrar (arquivo: Backend/src/routes/autenticacao.js).
- Implementar validação de credenciais no método login (arquivo: Backend/src/controllers/autenticacaoController.js).
- Gerar token de acesso JWT com expiração e corpo mínimo do usuário (arquivo: Backend/src/controllers/autenticacaoController.js).
- Consolidar geração de token no model dedicado (arquivo: Backend/src/models/tokenModel.js).
- Consolidar validação de token no model dedicado (arquivo: Backend/src/models/tokenModel.js).

### US-02 - Cadastro de usuários e permissões

Epic: BACKEND  Sprint: Sprint 1  Story Points: 5  Prioridade: Alta

Como administrador, quero cadastrar usuários e controlar suas permissões, para liberar o acesso ao sistema.

Descrição detalhada: Esta história concentra o cadastro inicial de usuários e a estrutura de autorização por perfil no backend. O objetivo é permitir que o sistema tenha contas válidas desde o início, com regras de acesso seguras e reutilizáveis para as próximas funcionalidades.

Critérios de aceite:

- Dado dados válidos quando criar usuário então salva o registro.
- Dado usuário sem permissão quando acessar rota restrita então retorna 403.

Tarefas técnicas:

- Ajustar rotas de usuários (arquivo: Backend/src/routes/usuarios.js).
- Implementar criar/atualizar/excluir no controlador de usuários (arquivo: Backend/src/controllers/usuariosController.js).
- Ajustar middleware requireAuth e requirePermission (arquivo: Backend/src/controllers/acessoController.js).

### US-04 - Cadastro e atualização de pacientes

Epic: BACKEND  Sprint: Sprint 1  Story Points: 5  Prioridade: Alta

Como profissional, quero cadastrar e atualizar pacientes com dados válidos, para manter prontuário consistente.

Descrição detalhada: Esta história concentra as operações de entrada e manutenção de dados cadastrais de pacientes, com validações obrigatórias no backend para preservar a integridade do banco.

Critérios de aceite:

- Dado corpo de requisição válido quando salvar paciente então persiste registro.
- Dado corpo de requisição inválido quando salvar paciente então retorna 400 com validações.

Tarefas técnicas:

- Ajustar rotas POST /api/pacientes e PUT /api/pacientes/:id (arquivo: Backend/src/routes/pacientes.js).
- Implementar validações do corpo de requisição no controlador de pacientes (arquivo: Backend/src/controllers/pacientesController.js).
- Persistir criar/atualizar com consultas SQL parametrizadas no fluxo atual (arquivos: Backend/src/controllers/pacientesController.js e Backend/src/models/database.js).
- Consolidar utilitários de validação de entrada (arquivo: Backend/src/models/validacaoModel.js).
- Consolidar resolução de esquema/tabela de pacientes (arquivo: Backend/src/models/esquemaModel.js).

### US-03 - Perfil do usuário autenticado

Epic: BACKEND  Sprint: Sprint 2  Story Points: 2  Prioridade: Alta

Como usuário logado, quero consultar meu perfil, para confirmar meus dados de acesso.

Descrição detalhada: Esta história garante que o usuário autenticado consiga recuperar seus dados de identificação e contexto de acesso logo após o login.

Critérios de aceite:

- Dado usuário autenticado quando consultar perfil então retorna dados corretos.
- Dado token inválido quando consultar perfil então retorna erro de autenticação.

Tarefas técnicas:

- Ajustar rota GET /api/autenticacao/perfil com requireAuth (arquivo: Backend/src/routes/autenticacao.js).
- Implementar retorno de perfil no método getUserProfile (arquivo: Backend/src/controllers/autenticacaoController.js).
- Tratar token ausente, inválido e expirado com resposta padronizada (arquivos: Backend/src/controllers/acessoController.js e Backend/src/controllers/autenticacaoController.js).
- Revisar validação de token usada no fluxo autenticado (arquivo: Backend/src/models/tokenModel.js).

### US-05 - Listagem de pacientes

Epic: BACKEND  Sprint: Sprint 2  Story Points: 3  Prioridade: Média

Como usuário autorizado, quero listar pacientes com filtros, para localizar registros rapidamente.

Descrição detalhada: Esta história trata da consulta de pacientes com usabilidade adequada, permitindo buscar registros por filtros e navegar pelos resultados.

Critérios de aceite:

- Dado parâmetros de filtro quando listar pacientes então retorna itens filtrados.
- Dado paciente existente quando buscar por identificação então retorna o registro correto.

Tarefas técnicas:

- Ajustar rota GET /api/pacientes para receber filtros de busca (arquivo: Backend/src/routes/pacientes.js).
- Implementar consulta com filtros no controlador de pacientes (arquivo: Backend/src/controllers/pacientesController.js).
- Garantir retorno consistente para lista e detalhamento (arquivo: Backend/src/controllers/pacientesController.js).

### US-06 - CRUD de cursos

Epic: BACKEND  Sprint: Sprint 2  Story Points: 3  Prioridade: Média

Como administrador, quero cadastrar e manter cursos, para organizar os módulos do sistema.

Descrição detalhada: Esta história sustenta a estrutura acadêmica do projeto, permitindo que o curso seja a base para vincular pacientes, perguntas e outras entidades.

Critérios de aceite:

- Dado curso válido quando cadastrar então persiste o registro.
- Dado curso existente quando atualizar então retorna sucesso.

Tarefas técnicas:

- Ajustar rotas de cursos (arquivo: Backend/src/routes/cursos.js).
- Implementar criar/atualizar/excluir no controlador de cursos (arquivo: Backend/src/controllers/cursosController.js).
- Registrar atividade quando houver alteração relevante (arquivo: Backend/src/models/registroAtividadeModel.js).

### US-10 - Auditoria e painel

Epic: BACKEND  Sprint: Sprint 3  Story Points: 5  Prioridade: Média

Como supervisor, quero consultar auditoria e painel consolidado, para acompanhar o uso do sistema.

Descrição detalhada: Esta história formaliza o acompanhamento das ações do sistema e a visão consolidada de dados para supervisionar a operação.

Critérios de aceite:

- Dado atividade registrada quando consultar auditoria então retorna o registro.
- Dado usuário autenticado quando consultar painel então retorna dados consolidados.

Tarefas técnicas:

- Ajustar rotas de atividades e painel (arquivos: Backend/src/routes/atividades.js e Backend/src/routes/dados-painel.js).
- Implementar listagem de atividades no controlador de atividades (arquivo: Backend/src/controllers/atividadesController.js).
- Implementar consolidação de dados no painel (arquivo: Backend/src/controllers/dadosPainelController.js).
- Garantir escrita de logs em operações principais (arquivo: Backend/src/models/registroAtividadeModel.js).
- Consolidar consultas de auditoria na camada de model (arquivo: Backend/src/models/atividadesModel.js).
- Revisar rotas de frequência no backend (arquivo: Backend/src/routes/frequencia.js).
- Revisar regras e consultas do controlador de frequência (arquivo: Backend/src/controllers/frequenciaController.js).
- Garantir resolução de esquema compartilhada no fluxo de frequência/painel (arquivo: Backend/src/models/esquemaModel.js).
- Reaproveitar utilitários de validação no fluxo de frequência (arquivo: Backend/src/models/validacaoModel.js).

### US-11 - Padronizar erros e testes de rotas críticas

Epic: BACKEND  Sprint: Sprint 3  Story Points: 5  Prioridade: Média

Como consumidor da API, quero erros padronizados e cobertura básica de testes, para facilitar integração e reduzir regressão.

Descrição detalhada: Esta história formaliza a qualidade técnica mínima do backend por meio de padronização de erros e testes de integração nas rotas mais críticas.

Critérios de aceite:

- Dado erro de negócio quando ocorrer então retorna estrutura única de erro.
- Dado execução de testes quando rodar suíte então cenários críticos passam.

Tarefas técnicas:

- Refatorar middleware global de erro no server para contrato único (arquivo: Backend/src/server.js).
- Padronizar respostas de erro em controladores críticos (arquivos: Backend/src/controllers/autenticacaoController.js, Backend/src/controllers/pacientesController.js, Backend/src/controllers/usuariosController.js).
- Criar testes de integração para login, usuários, pacientes e prontuários (arquivos: pasta de testes do Backend).

### US-12 - Revisão final de documentação e banco

Epic: BACKEND  Sprint: Sprint 3  Story Points: 2  Prioridade: Baixa

Como equipe do projeto, quero revisar a consistência final entre rotas, banco e documentação, para encerrar a entrega com previsibilidade.

Descrição detalhada: Esta história representa a consolidação final do backend antes da apresentação.

Critérios de aceite:

- Dado revisão concluída quando verificar rotas e banco então a documentação está coerente.
- Dado ajustes finais quando houver então a base continua funcionando sem quebra das histórias principais.

Tarefas técnicas:

- Revisar nomes de rotas e arquivos usados na documentação.
- Conferir scripts SQL e estrutura de banco.
- Atualizar observações finais para apresentação no Taiga.
- Revisar endpoints de arquivos arquivados (arquivo: Backend/src/routes/arquivo.js).
- Revisar regras e respostas do controlador de arquivo (arquivo: Backend/src/controllers/arquivoController.js).
- Revisar consultas da camada de model de arquivo (arquivo: Backend/src/models/arquivoModel.js).

### US-07 - Cadastro de perguntas dos prontuários

Epic: BACKEND  Sprint: Sprint 4  Story Points: 5  Prioridade: Alta

Como profissional responsável pelo curso, quero criar, editar e desativar perguntas, para montar prontuários padronizados por área.

Descrição detalhada: Esta história cobre o cadastro das perguntas que serão utilizadas nos prontuários de cada curso.

Critérios de aceite:

- Dado corpo de requisição válido quando criar pergunta então a API salva e retorna o registro criado.
- Dado tipo de pergunta inválido quando criar pergunta então a API retorna 400.
- Dado usuário sem permissão quando editar ou deletar pergunta então a API retorna 403.

Tarefas técnicas:

- Ajustar rota de perguntas por curso (arquivo: Backend/src/routes/questionarios.js).
- Implementar criação, edição e exclusão de perguntas (arquivo: Backend/src/controllers/questionariosController.js).
- Garantir checagem de permissões por curso e perfil (arquivo: Backend/src/controllers/questionariosController.js).

### US-08 - Montar prontuário com perguntas

Epic: BACKEND  Sprint: Sprint 4  Story Points: 5  Prioridade: Alta

Como profissional responsável, quero criar prontuários com conjunto de perguntas e ordem definida, para padronizar a aplicação por curso.

Descrição detalhada: Esta história trata da criação e manutenção da estrutura do prontuário, vinculando perguntas previamente cadastradas.

Critérios de aceite:

- Dado prontuário com perguntas válidas quando criar então a estrutura é salva com ordenação.
- Dado tentativa de publicar prontuário sem perguntas ativas então a API retorna 400.
- Dado prontuário existente quando consultar perguntas então a API retorna lista ordenada.

Tarefas técnicas:

- Implementar criação de prontuário com vínculo de perguntas (arquivo: Backend/src/controllers/questionariosController.js).
- Implementar atualização de prontuário com reordenação e ativação/desativação de vínculos (arquivo: Backend/src/controllers/questionariosController.js).
- Implementar publicação com validação de pelo menos uma pergunta ativa (arquivo: Backend/src/controllers/questionariosController.js).
- Implementar listagem por curso e consulta de perguntas por prontuário (arquivo: Backend/src/controllers/questionariosController.js).

### US-09 - Salvar respostas do prontuário do paciente

Epic: BACKEND  Sprint: Sprint 4  Story Points: 5  Prioridade: Alta

Como profissional autorizado, quero salvar as respostas do prontuário do paciente e consultar o histórico, para acompanhar evolução clínica e registros aplicados.

Descrição detalhada: Esta história cobre o envio e persistência das respostas de um prontuário para um paciente específico.

Critérios de aceite:

- Dado idPaciente, idQuestionario e respostas válidos quando salvar então a API cria o registro de resposta.
- Dado corpo de requisição incompleto quando salvar resposta então a API retorna 400.
- Dado paciente e prontuário válidos quando consultar histórico então a API retorna respostas em ordem decrescente de data.

Tarefas técnicas:

- Implementar rota de salvar respostas (arquivo: Backend/src/controllers/questionariosController.js).
- Validar idPaciente, idQuestionario e respostas no controlador antes de persistir (arquivo: Backend/src/controllers/questionariosController.js).
- Montar e persistir instantâneo de perguntas + respostas em respostas_questionarios (arquivo: Backend/src/controllers/questionariosController.js).
- Implementar rota de histórico por paciente e prontuário (arquivo: Backend/src/controllers/questionariosController.js).

## Distribuição fixa (3 histórias por sprint)

- Sprint 1: US-01, US-02, US-04
- Sprint 2: US-03, US-05, US-06
- Sprint 3: US-10, US-11, US-12
- Sprint 4: US-07, US-08, US-09



