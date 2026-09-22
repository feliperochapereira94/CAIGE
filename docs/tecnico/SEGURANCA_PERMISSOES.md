# Segurança e Permissões

## 1. Princípio geral
O frontend controla a experiência visual.

O **backend controla a autorização real**.

Ocultar um botão, aba ou menu não substitui validação no servidor.

## 2. Autenticação
A autenticação usa JWT Bearer.

Middleware oficial:
- `requireAuth`.

Nas rotas autenticadas, o backend:
1. lê `Authorization: Bearer <token>`;
2. valida assinatura e expiração do token;
3. recupera o usuário no banco pelo e-mail do token;
4. rejeita a sessão quando o usuário está inativo ou oculto/arquivado;
5. monta `req.user`.

O login também rejeita usuários inativos ou ocultos, portanto um usuário desativado/arquivado não mantém acesso apenas por possuir um JWT ainda não expirado.

## 3. Identidade autenticada
Campos utilizados:
- `req.user.id`;
- `req.user.email`;
- `req.user.name`;
- `req.user.role`;
- `req.user.idCurso`.

`req.user` deve ser tratado como fonte confiável de identidade/autoria nas rotas autenticadas.

## 4. Autorização
Middlewares principais:
- `requirePermission(...)`;
- `requireSupervisor`.

### `requirePermission`
Consulta a tabela `permissoes` de acordo com o papel autenticado.

Permissões da estrutura atual incluem:
- `pode_registrar_frequencia`;
- `pode_criar_paciente`;
- `pode_editar_paciente`;
- `pode_visualizar_paciente`;
- `pode_visualizar_relatorios`;
- `pode_visualizar_questionarios`;
- `pode_gerenciar_atividades`.

### `requireSupervisor`
Bloqueia a operação quando `req.user.role !== 'SUPERVISOR'`.

## 5. Perfis da V1

### SUPERVISOR
Na base limpa, possui todas as permissões funcionais consultadas pelo middleware `requirePermission`.

Além disso, rotas administrativas específicas exigem diretamente `requireSupervisor`, como:
- administração de usuários;
- criação/edição/remoção de cursos;
- arquivados;
- configuração de períodos letivos;
- grade do calendário;
- datas sem atendimento.

### PROFESSOR
Na base limpa:
- pode registrar frequência;
- pode criar/editar/visualizar pacientes;
- pode visualizar relatórios;
- pode visualizar questionários;
- pode gerenciar atividades do próprio curso;
- pode acessar o painel;
- não possui gerenciamento de usuários, pois essa área é protegida diretamente por `requireSupervisor`.

## 6. Escopo por curso
Para operações com escopo de curso, o PROFESSOR deve usar `req.user.idCurso`.

Regras consolidadas:
- não pode consultar atividade de outro curso;
- não pode criar atividade em outro curso;
- não pode editar/desativar atividade de outro curso;
- `GET /api/cursos` retorna somente o curso permitido para PROFESSOR;
- questionários e perguntas respeitam o curso autenticado nas operações de gestão;
- registro/consulta de frequência é limitado ao curso do PROFESSOR;
- `GET /api/movimentacoes/recentes` limita o PROFESSOR a `movimentacoes.id_curso = req.user.idCurso`;
- os eventos recentes de `/api/dados-painel` usam o mesmo escopo de curso para PROFESSOR;
- movimentações sem `id_curso` permanecem globais e são visíveis ao SUPERVISOR, não ao PROFESSOR;
- filtros enviados pelo cliente não devem ampliar o escopo do usuário.

## 7. Questionários e prontuário
- PROFESSOR lista/gerencia modelos dentro do escopo permitido;
- perguntas compartilhadas permanecem uma única entidade com vínculos em `perguntas_cursos`;
- um questionário só usa perguntas compatíveis com seu curso;
- publicação/edição/exclusão validam escopo;
- salvar resposta registra `req.user.id` como profissional responsável;
- a leitura do histórico já registrado é interdisciplinar conforme as rotas de consulta do paciente.

## 8. Frequência
Rotas:
- histórico: autenticado;
- relatório: exige `pode_visualizar_relatorios`;
- contexto: autenticado;
- registro: exige `pode_registrar_frequencia`.

Para PROFESSOR, o backend aplica `req.user.idCurso` nas consultas relevantes.

O filtro por profissional do relatório é considerado apenas para SUPERVISOR.

## 9. Calendário de frequência
Todas as rotas de `/api/periodos-letivos` exigem:
- JWT válido;
- `requireSupervisor`.

PROFESSOR não pode criar/alterar:
- período letivo;
- grade semanal;
- datas sem atendimento.

## 10. Usuários e arquivados
As rotas de:
- `/api/usuarios`;
- `/api/arquivo/...`

são administrativas e exigem `SUPERVISOR`.

Na edição de usuários:
- alteração de nome e redefinição de senha são operações sensíveis;
- o backend exige a senha atual do Supervisor autenticado em `senhaSupervisor`;
- `novaSenha`, quando informada, deve possuir no mínimo 6 caracteres e é armazenada somente como hash `bcryptjs`;
- o backend não confia em flags de confirmação enviadas pelo frontend para autorizar a operação.

No ciclo de arquivamento:
- o usuário deve ser desativado antes de `DELETE /api/usuarios/{id}`;
- o arquivamento é lógico (`ativo=false`, `oculto=true`) e não remove o registro do banco;
- a recuperação pela área de Arquivados restaura `oculto=false`, mas mantém `ativo=false`;
- a conta `suportecaige@univale.br` é protegida e não pode ser arquivada;
- tentativas diretas pela API obedecem às mesmas regras da interface.

## 11. Fotos de pacientes e PWA
- `POST /api/pacientes/{id}/foto` e `DELETE /api/pacientes/{id}/foto` exigem JWT e `pode_editar_paciente`;
- o backend valida ID positivo, Data URL WebP e tamanho máximo de 300 KB após decodificação;
- o nome físico do arquivo é derivado apenas do ID validado (`<id>.webp`), sem aceitar caminho fornecido pelo cliente;
- fotos ficam em `Frontend/recursos/uploads/pacientes/`, fora do schema MySQL;
- o Service Worker nunca coloca `/api/` nem `/recursos/uploads/` em cache;
- o PWA exige contexto seguro (HTTPS) fora de `localhost`.

## 12. Senhas e ambiente
- senhas são armazenadas com hash usando `bcryptjs`;
- segredo JWT deve vir de `JWT_SECRET`;
- `.env` real não deve ser versionado/distribuído;
- usar uma chave JWT longa e exclusiva em produção.

## 13. Checklist para novas rotas
Antes de publicar uma rota nova:
- [ ] exige autenticação?
- [ ] exige permissão específica?
- [ ] é exclusiva de Supervisor?
- [ ] possui escopo por curso?
- [ ] o cliente consegue forçar outro `idCurso`?
- [ ] autoria vem de `req.user`?
- [ ] dados de erro não expõem segredo?
- [ ] OpenAPI foi atualizado?

## 14. Regra final
Nunca confiar exclusivamente em restrições visuais do frontend para proteger dados ou operações.
