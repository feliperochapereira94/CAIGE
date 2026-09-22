# Manual do Supervisor

## 1. Acesso
O Supervisor entra no CAIGE com e-mail e senha e possui acesso administrativo ampliado.

## 2. Navegação
Além dos módulos operacionais, o Supervisor possui acesso ao **Painel de Gerenciamento**.

Módulos principais:
- Painel;
- Movimentações;
- Pacientes;
- Gestão de Prontuários;
- Frequência;
- Painel de Gerenciamento.

No **Painel** e em **Movimentações**, o Supervisor mantém visão global dos registros de todos os cursos e das movimentações administrativas sem curso.

## 3. Pacientes
O Supervisor pode:
- listar e pesquisar pacientes;
- cadastrar pacientes;
- editar dados;
- visualizar perfil;
- acessar prontuário;
- alterar status conforme o fluxo disponível;
- administrar pacientes arquivados no Painel de Gerenciamento.

## 4. Prontuários
O Supervisor possui visão administrativa ampliada da Gestão de Prontuários.

Pode:
- consultar modelos;
- cadastrar/editar perguntas;
- vincular perguntas a cursos;
- criar/editar/publicar modelos de prontuário;
- consultar histórico interdisciplinar do paciente;
- realizar lançamentos quando permitido pelo fluxo.

## 5. Frequência
O Supervisor pode:
- registrar frequência;
- consultar histórico;
- gerar relatórios;
- filtrar por curso;
- filtrar por atividade;
- filtrar por profissional;
- selecionar pacientes;
- exportar/imprimir relatórios conforme a tela.

O percentual usa o calendário semestral configurado no Painel de Gerenciamento.

## 6. Painel de Gerenciamento
A área administrativa possui as abas atuais:
- **Usuários**;
- **Cursos**;
- **Calendário de Frequência**;
- **Auditoria**;
- **Arquivados**.

## 7. Usuários
Na aba **Usuários**, o Supervisor pode:
- criar usuário;
- definir papel;
- vincular Professor a curso;
- ativar/inativar conforme o fluxo atual;
- editar dados permitidos;
- redefinir a senha de um usuário quando necessário;
- consultar usuários cadastrados.

Ao alterar o nome ou redefinir a senha, o sistema solicita a senha atual do Supervisor antes de concluir a operação. A nova senha deve possuir no mínimo 6 caracteres.

## 8. Cursos e atividades
Na aba **Cursos**, o Supervisor pode:
- criar curso;
- editar curso;
- remover curso quando a regra permitir;
- abrir as atividades do curso;
- cadastrar/editar/desativar atividades de atendimento.

## 9. Calendário de Frequência
Essa área é exclusiva do Supervisor.

### Período letivo
É possível cadastrar:
- ano;
- semestre;
- data inicial;
- data final;
- status.

Regras importantes:
- períodos não podem se sobrepor;
- só pode existir um período ativo por vez;
- período encerrado fica bloqueado para alterações.

### Dias de atendimento
Para cada curso/atividade, configure os dias da semana em que existem encontros.

Pode existir:
- configuração geral do curso;
- configuração específica de uma atividade.

### Datas sem atendimento
Use para feriados, recessos ou cancelamentos.

A data pode valer:
- para todo o CAIGE naquele período;
- somente para um atendimento específico.

Essas datas são excluídas dos encontros previstos usados no cálculo de frequência.

## 10. Auditoria
A aba **Auditoria** permite consultar movimentações administrativas e operacionais.

A tela possui exportações em:
- PDF;
- Excel.

A estrutura oficial de auditoria do backend é `movimentacoes`.

## 11. Arquivados
Na aba **Arquivados**, o Supervisor pode consultar itens arquivados e usar as ações administrativas disponibilizadas pelo sistema, incluindo recuperação de paciente e ocultação definitiva da interface conforme o fluxo atual.

## 12. Segurança
Mesmo sendo Supervisor, as operações continuam protegidas pelo backend.

Rotas administrativas utilizam `requireSupervisor` e/ou permissões específicas.

## 13. Fluxo recomendado
1. entrar no sistema;
2. acompanhar o Painel/Movimentações;
3. realizar atividades operacionais necessárias;
4. usar o Painel de Gerenciamento para usuários, cursos e calendário;
5. conferir Auditoria quando necessário;
6. manter períodos/datas sem atendimento atualizados antes da emissão de relatórios;
7. realizar logout ao finalizar.
