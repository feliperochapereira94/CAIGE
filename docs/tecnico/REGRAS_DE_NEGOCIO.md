# Regras de Negócio

## 1. Estrutura central
Fluxo operacional principal:

```text
CURSO → ATIVIDADE DE ATENDIMENTO → FREQUÊNCIA
```

No domínio clínico:

```text
PACIENTE → PRONTUÁRIO → LANÇAMENTOS/RESPOSTAS
```

## 2. Perfis
Existem dois papéis principais:
- `SUPERVISOR`;
- `PROFESSOR`.

O SUPERVISOR possui escopo administrativo ampliado.

O PROFESSOR possui `usuarios.id_curso` e deve atuar dentro do curso vinculado nas operações com escopo de curso.

## 3. Administração de usuários
- criação e edição administrativa de usuários são exclusivas do `SUPERVISOR`;
- o Supervisor pode redefinir a senha de um usuário pela edição administrativa;
- se houver alteração de nome ou senha, o backend exige confirmação da senha atual do Supervisor autenticado;
- a nova senha deve possuir no mínimo 6 caracteres;
- senha em texto puro nunca é armazenada nem registrada em movimentações.

## 4. Pacientes
- pacientes podem ser cadastrados, consultados e editados conforme permissões;
- o ciclo operacional utiliza os status `ativo`, `inativo` e `arquivado`;
- a ocultação definitiva da interface é lógica, preservando histórico relacional;
- registros históricos não devem ser destruídos apenas para retirar o paciente das listagens operacionais.
- a foto do paciente é opcional e usa arquivo WebP nomeado pelo ID; não existe coluna de foto no schema MySQL;
- o frontend aceita seleção JPG, PNG ou WebP de até 8 MB, realiza recorte/otimização e envia WebP ao backend;
- o backend aceita somente Data URL `image/webp` e limita o arquivo otimizado a 300 KB;
- salvar/remover foto exige a permissão `pode_editar_paciente`;
- sem foto disponível, a interface utiliza as iniciais do nome como fallback.

## 5. Atividades de atendimento
- cada atividade pertence a um curso;
- o PROFESSOR pode gerenciar atividades somente do próprio curso;
- o SUPERVISOR pode administrar atividades de cursos distintos;
- atividades de atendimento são a estrutura vigente para frequência;
- a antiga tabela/rota genérica `atividades` não faz parte da V1 final.

## 6. Prontuário interdisciplinar
- o prontuário possui finalidade clínica;
- perguntas podem ser vinculadas a um ou vários cursos sem duplicar a pergunta;
- `perguntas_cursos` mantém esses vínculos;
- questionários pertencem a um curso;
- PROFESSOR cria/altera conteúdo apenas no curso autenticado;
- SUPERVISOR possui visão administrativa ampliada;
- leitura do histórico do paciente é interdisciplinar conforme as rotas de respostas;
- cada lançamento registra o profissional responsável;
- a estrutura do prontuário no momento do lançamento é preservada por snapshot quando disponível, evitando reinterpretar um registro antigo após mudanças no modelo.

## 7. Frequência — registro
- frequência relaciona paciente, atividade de atendimento e profissional;
- o momento oficial do registro é `frequencia.registrado_em`;
- PROFESSOR fica restrito ao próprio curso nas consultas e registros;
- SUPERVISOR possui escopo ampliado;
- o registro depende da permissão `pode_registrar_frequencia`.

## 8. Calendário de frequência

### 8.1 Período letivo
O calendário usa `periodos_letivos` com:
- ano;
- semestre `1` ou `2`;
- data inicial;
- data final;
- status `PLANEJADO`, `ATIVO` ou `ENCERRADO`.

Regras:
- períodos não podem se sobrepor;
- somente um período pode estar `ATIVO` por vez;
- período `ENCERRADO` fica bloqueado para alteração de datas/status, grade e exceções;
- anos não são hardcoded na interface nem na regra de negócio.

### 8.2 Dias de atendimento por atividade
`grade_periodo_letivo` registra os dias da semana previstos para os atendimentos.

Regra vigente da V1:
- os dias usam padrão ISO `1` a `7`;
- cada atividade utilizada em frequência deve possuir seus próprios dias de atendimento cadastrados;
- **não existe herança/fallback dos dias gerais do curso para autorizar presença ou calcular a agenda de uma atividade**;
- atividade sem dias cadastrados bloqueia o registro e os relatórios que dependam daquela agenda;
- atividade com dias cadastrados, mas fora do dia atual, não aceita presença naquele dia.

Registros de grade em nível de curso podem existir na estrutura administrativa, mas não ampliam nem substituem os dias específicos exigidos para uma atividade.

### 8.3 Datas sem atendimento
`excecoes_periodo_letivo` permite retirar datas do calendário previsto.

Exemplos:
- feriado;
- recesso;
- cancelamento de atendimento.

Uma exceção vinculada a atendimento só pode ser aplicada a uma data compatível com a programação correspondente.

### 8.4 Bloqueios obrigatórios
O calendário é pré-condição funcional para lançamento e cálculo:
- registro de presença exige data dentro de período `ATIVO`;
- período `PLANEJADO` ainda não aceita presença;
- período `ENCERRADO` não aceita novos lançamentos;
- a atividade precisa ter o dia atual explicitamente cadastrado;
- datas configuradas como sem atendimento bloqueiam presença;
- chamadas diretas à API não podem contornar essas regras;
- relatório é bloqueado quando não existe período/calendário aplicável ou quando alguma atividade necessária não possui agenda configurada.

### 8.5 Relatórios amplos
- “Todos os cursos” e “Todas as atividades” permanecem opções válidas quando disponíveis ao perfil autenticado;
- o calendário é calculado por atividade;
- cada encontro previsto é identificado pelo par atividade + data;
- em relatório amplo, cada paciente é calculado sobre as atividades em que possui participação compatível com os filtros;
- se uma atividade envolvida não possuir dias próprios no semestre correspondente, a geração é bloqueada e a mensagem deve indicar a configuração ausente;
- o filtro de profissional restringe os registros apresentados quando permitido, mas não altera a agenda prevista da atividade;
- filtros restaurados ao reabrir a tela não disparam o relatório automaticamente.

## 9. Cálculo do percentual de frequência
O relatório monta as **datas previstas válidas** das atividades dentro do intervalo solicitado e remove as exceções sem atendimento.

Para cada paciente elegível:

```text
Percentual de frequência =
encontros com presença em datas previstas
÷
encontros previstos válidos
× 100
```

Também podem ser retornados:
- `encontrosPrevistos`;
- `encontrosComPresenca`;
- `faltas`;
- `percentualFrequencia`;
- `calculoFrequenciaDisponivel`.

`faltas` corresponde a `encontros previstos - encontros com presença`, com mínimo igual a zero.

Registros históricos fora do dia previsto permanecem consultáveis para rastreabilidade, mas não contam como comparecimento nem alteram o percentual.

## 10. Situações que bloqueiam ou impedem o cálculo
Entre os casos tratados pela V1:
- não existir período letivo `ATIVO` ou `ENCERRADO` aplicável ao intervalo;
- uma atividade necessária não possuir dias próprios cadastrados;
- não existirem encontros previstos válidos após aplicar período, agenda e exceções;
- o relatório exigir seleção de paciente e nenhum paciente ter sido selecionado.

O sistema deve informar a configuração ausente ou a condição inválida, em vez de inventar percentual.

## 11. Administração do calendário
Criação/edição de períodos, grade semanal e datas sem atendimento são operações exclusivas de `SUPERVISOR`.

O PROFESSOR utiliza o calendário configurado pelo Supervisor para registro e relatórios, mas não altera a estrutura do período letivo.

## 12. Auditoria
- a estrutura oficial de auditoria é `movimentacoes`;
- ações relevantes de cadastro/alteração devem usar o mecanismo atual de movimentações;
- movimentações operacionais de curso devem registrar `id_curso` quando o contexto possuir curso definido;
- SUPERVISOR possui visão global das movimentações;
- PROFESSOR visualiza no Painel e em Movimentações somente registros com `id_curso` igual ao curso autenticado;
- registros sem curso são globais e não entram na visão operacional do PROFESSOR;
- a auditoria e o histórico de ações devem utilizar `movimentacoes` como estrutura oficial.

## 13. Arquivamento
As rotas administrativas de arquivo são exclusivas do SUPERVISOR.

Pacientes e usuários arquivados podem ser recuperados pelos fluxos administrativos previstos. A retirada das listagens operacionais preserva a integridade histórica por estratégia lógica, sem apagar relacionamentos necessários.

## 14. Regra de manutenção
Se uma mudança alterar qualquer regra deste documento, a alteração de código e a atualização desta documentação devem fazer parte da mesma entrega.
