# Banco de Dados

## 1. Visão geral
O CAIGE utiliza **MySQL** como banco de dados principal. A estrutura e os scripts de apoio ficam em `Backend/database/`.

Esta documentação descreve a estrutura **vigente** do banco de dados da V1.

## 2. Scripts principais
- `Backend/database/CAIGE BANCO LIMPO.sql`
- `Backend/database/CAIGE BANCO TESTE.sql`
- `Backend/database/CAIGE_BANCO_BANCA_113.sql`

Os três scripts acima já refletem o schema vigente da V1. Não há migrations históricas mantidas no pacote final.

## 3. Tabelas operacionais atuais
### Estrutura institucional
- `cursos`
- `usuarios`
- `permissoes`

### Pacientes e prontuário
- `pacientes`
- `perguntas`
- `perguntas_cursos`
- `questionarios`
- `questoes_questionarios`
- `respostas_questionarios`

### Frequência
- `atividades_atendimento`
- `frequencia`
- `periodos_letivos`
- `grade_periodo_letivo`
- `excecoes_periodo_letivo`

### Auditoria
- `movimentacoes`

## 4. Relações principais
- `usuarios.id_curso` → `cursos.id`
- `usuarios.papel` → `permissoes.papel` (vínculo lógico usado na verificação de permissões)
- `pacientes` é a entidade central dos dados clínicos e cadastrais
- `atividades_atendimento.id_curso` → `cursos.id`
- `frequencia.id_paciente` → `pacientes.id`
- `frequencia.id_atividade` → `atividades_atendimento.id`
- `frequencia.id_profissional` → `usuarios.id`
- `questionarios.id_curso` → `cursos.id`
- `questoes_questionarios.id_questionario` → `questionarios.id`
- `respostas_questionarios.id_paciente` → `pacientes.id`
- `respostas_questionarios.id_questionario` → `questionarios.id`
- `respostas_questionarios.id_profissional` → `usuarios.id`
- `movimentacoes.id_usuario` → `usuarios.id`

## 5. Destaques funcionais
### Pacientes
A tabela `pacientes` concentra:
- dados cadastrais;
- dados clínicos essenciais;
- status operacional do paciente;
- ocultação lógica quando aplicável.

A foto do paciente **não é armazenada no MySQL**. O arquivo é persistido como `Frontend/recursos/uploads/pacientes/<id>.webp`; o backend infere sua existência pelo ID e devolve a URL na API quando disponível.

### Frequência
A frequência foi simplificada para usar `registrado_em` como campo oficial do momento do registro.

### Prontuário
O prontuário é interdisciplinar:
- perguntas podem ser reaproveitadas em vários cursos;
- vínculos por curso são mantidos em `perguntas_cursos`;
- respostas preservam histórico do profissional e estrutura da aplicação no momento do registro.

### Auditoria
A auditoria oficial utiliza a tabela `movimentacoes`.


## 6. Integridade e índices
- `usuarios.email` já é `UNIQUE`; não existe índice simples duplicado para a mesma coluna.
- `periodos_letivos.semestre` aceita somente `1` ou `2`.
- `periodos_letivos.data_inicio` deve ser menor ou igual a `data_fim`.
- `grade_periodo_letivo.dia_semana` aceita somente valores de `1` a `7`.
- filtros por data em frequência e movimentações usam intervalos sobre `registrado_em`/`criado_em`, preservando o uso dos índices temporais existentes.
- `usuarios` não mantém o campo legado `setor`; o vínculo institucional do Professor é definido por `id_curso`.
- a tabela `permissoes` mantém somente flags realmente consultadas pelo backend; rotas administrativas exclusivas continuam protegidas por `requireSupervisor`.

## 7. Observações para manutenção
- alterações estruturais futuras devem atualizar os scripts oficiais e, quando necessárias para uma base já existente, usar uma migration temporária e versionada;
- antes de alterar tabelas críticas, gerar backup;
- manter documentação e scripts alinhados;
- manter a estrutura documentada alinhada ao schema vigente e às regras de negócio da aplicação.
