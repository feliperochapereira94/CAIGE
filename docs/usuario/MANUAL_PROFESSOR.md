# Manual do Professor

## 1. Acesso
O Professor entra no CAIGE com e-mail e senha e utiliza o ambiente autenticado do sistema.

O perfil deve estar vinculado a um curso por `usuarios.id_curso`.

## 2. Navegação disponível
O Professor possui acesso aos módulos operacionais:
- Painel;
- Movimentações;
- Pacientes;
- Gestão de Prontuários;
- Frequência.

O menu do usuário também disponibiliza **Meu Curso**.

O Professor **não acessa o Painel de Gerenciamento**.

## 3. Meu Curso
A tela **Meu Curso** mostra o curso vinculado ao Professor e suas atividades de atendimento.

Nela é possível:
- visualizar o curso;
- consultar atividades;
- criar uma nova atividade;
- editar/desativar atividades do próprio curso.

Se o usuário não possuir curso vinculado, o sistema orienta procurar um Supervisor.

## 4. Movimentações
A tela **Movimentações** mostra somente registros vinculados ao curso do Professor autenticado. O mesmo escopo é aplicado à área **Movimentações importantes** do Painel.

Eventos de outros cursos e movimentações administrativas/globais sem curso não são exibidos ao Professor. Use os filtros da tela para restringir data, tipo e responsável dentro desse escopo.

## 5. Pacientes
O Professor pode trabalhar com pacientes de acordo com as permissões da V1.

Fluxo comum:
1. abrir **Pacientes**;
2. pesquisar/localizar o paciente;
3. cadastrar um novo paciente quando necessário;
4. usar **Visualizar** para abrir o perfil;
5. editar dados quando autorizado;
6. acessar o prontuário pelo perfil do paciente.

## 6. Prontuário
O prontuário individual é acessado a partir do paciente.

O Professor pode:
- consultar o histórico interdisciplinar disponível;
- selecionar modelos permitidos;
- realizar novo lançamento clínico;
- registrar respostas no contexto do próprio curso.

A autoria do lançamento é vinculada ao usuário autenticado.

## 7. Gestão de Prontuários
Na **Gestão de Prontuários**, o Professor atua limitado ao próprio curso.

Subáreas:
- Prontuários Cadastrados;
- Cadastro de Perguntas.

Pode criar/editar estruturas permitidas para o curso, respeitando perguntas compartilhadas e regras de vínculo.

## 8. Frequência

### Registrar frequência
1. abrir **Frequência**;
2. escolher a atividade do curso;
3. pesquisar/selecionar o paciente;
4. registrar a frequência;
5. confirmar a mensagem de sucesso.

O backend impede que o Professor amplie o registro para outro curso.

### Relatório
O Professor pode gerar relatório de frequência usando os filtros disponíveis.

A regra de percentual depende do calendário semestral configurado pelo Supervisor:
- período letivo;
- dias de atendimento;
- datas sem atendimento.

O Professor não altera esse calendário administrativo.

### Percentual
Quando o cálculo estiver disponível:

```text
presenças em encontros previstos
÷
encontros previstos válidos
× 100
```

Se os filtros não forem compatíveis com o calendário, o sistema pode apresentar a frequência como não calculada.

## 9. Limitações do perfil
O Professor:
- não gerencia usuários;
- não administra cursos globalmente;
- não acessa Auditoria administrativa;
- não acessa Arquivados administrativos;
- não configura períodos letivos;
- não configura datas sem atendimento;
- atua restrito ao curso vinculado nas operações com escopo de curso.

## 10. Segurança
A restrição real é aplicada pelo backend com base em:
- JWT;
- permissões;
- `req.user.idCurso`.

Não é apenas uma limitação visual da interface.

## 11. Fluxo recomendado
1. entrar no sistema;
2. consultar o Painel;
3. usar **Meu Curso** para atividades;
4. localizar/cadastrar pacientes;
5. registrar prontuários conforme atendimento;
6. registrar frequência;
7. consultar relatórios quando necessário;
8. sair pelo menu do usuário ao finalizar.
