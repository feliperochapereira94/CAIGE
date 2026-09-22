-- =====================================================================
-- CAIGE - ESTRUTURA ATUAL DO BANCO
-- MySQL / MySQL Workbench
-- Baseado no projeto CAIGE atualizado em 21/09/2026
-- =====================================================================
-- ATENCAO: este script APAGA o banco `caige` existente e o recria.
-- Execute conectado ao servidor MySQL pelo Workbench.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS caige;

CREATE DATABASE caige
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE caige;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- CURSOS
-- ---------------------------------------------------------------------
CREATE TABLE cursos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL UNIQUE,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  email        VARCHAR(255) NOT NULL UNIQUE,
  senha_hash   VARCHAR(255) NOT NULL,
  nome         VARCHAR(255) NULL,
  papel        ENUM('SUPERVISOR','PROFESSOR') NOT NULL DEFAULT 'PROFESSOR',
  id_curso     INT NULL,
  criado_por   INT NULL,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  oculto       BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_login DATETIME NULL,
  criado_em    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_curso
    FOREIGN KEY (id_curso) REFERENCES cursos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_usuarios_criado_por
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
    ON DELETE SET NULL,
  INDEX idx_usuarios_curso (id_curso),
  INDEX idx_usuarios_papel_ativo (papel, ativo, oculto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- PERMISSOES
-- ---------------------------------------------------------------------
CREATE TABLE permissoes (
  id                             INT AUTO_INCREMENT PRIMARY KEY,
  papel                          VARCHAR(50) NOT NULL UNIQUE,
  pode_registrar_frequencia      BOOLEAN NOT NULL DEFAULT FALSE,
  pode_criar_paciente            BOOLEAN NOT NULL DEFAULT FALSE,
  pode_editar_paciente           BOOLEAN NOT NULL DEFAULT FALSE,
  pode_visualizar_paciente       BOOLEAN NOT NULL DEFAULT FALSE,
  pode_visualizar_relatorios     BOOLEAN NOT NULL DEFAULT FALSE,
  pode_visualizar_questionarios  BOOLEAN NOT NULL DEFAULT FALSE,
  pode_gerenciar_atividades      BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- PACIENTES
-- ---------------------------------------------------------------------
CREATE TABLE pacientes (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  nome                    VARCHAR(255) NOT NULL,
  data_nascimento         DATE NOT NULL,
  genero                  VARCHAR(50) NULL,
  cpf                     VARCHAR(20) NULL,
  telefone                VARCHAR(20) NULL,
  celular                 VARCHAR(20) NULL,
  cep                     VARCHAR(20) NULL,
  rua                     VARCHAR(255) NOT NULL,
  numero                  VARCHAR(50) NOT NULL,
  bairro                  VARCHAR(255) NOT NULL,
  cidade                  VARCHAR(255) NOT NULL,
  estado                  VARCHAR(50) NOT NULL,
  responsavel             VARCHAR(255) NOT NULL,
  parentesco_responsavel  VARCHAR(50) NULL,
  telefone_responsavel    VARCHAR(20) NULL,
  observacoes             LONGTEXT NULL,
  condicoes_saude         LONGTEXT NULL COMMENT 'Uma condicao por linha',
  condicoes_saude_avaliadas BOOLEAN NOT NULL DEFAULT FALSE,
  alergias                LONGTEXT NULL COMMENT 'Uma alergia por linha',
  alergias_avaliadas      BOOLEAN NOT NULL DEFAULT FALSE,
  medicamentos_uso        LONGTEXT NULL COMMENT 'Um medicamento por linha',
  medicamentos_avaliados  BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes_clinicas    LONGTEXT NULL,
  peso_kg                 DECIMAL(6,2) NULL,
  altura_cm               DECIMAL(6,2) NULL,
  status                  ENUM('ativo','inativo','arquivado') NOT NULL DEFAULT 'ativo',
  oculto                  BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pacientes_nome (nome),
  INDEX idx_pacientes_status (status),
  INDEX idx_pacientes_oculto (oculto),
  INDEX idx_pacientes_cpf (cpf)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- ATIVIDADES DE ATENDIMENTO POR CURSO
-- ---------------------------------------------------------------------
CREATE TABLE atividades_atendimento (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_curso       INT NOT NULL,
  nome           VARCHAR(150) NOT NULL,
  descricao      TEXT NULL,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_atividades_atendimento_curso
    FOREIGN KEY (id_curso) REFERENCES cursos(id)
    ON DELETE RESTRICT,
  UNIQUE KEY uq_atividade_curso_nome (id_curso, nome),
  INDEX idx_atividades_atendimento_curso_ativo (id_curso, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- FREQUENCIA
-- O momento do registro e armazenado exclusivamente em registrado_em.
-- ---------------------------------------------------------------------
CREATE TABLE frequencia (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente     INT NOT NULL,
  id_profissional INT NULL,
  id_atividade    INT NOT NULL,
  observacoes     VARCHAR(500) NULL,
  registrado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_frequencia_paciente
    FOREIGN KEY (id_paciente) REFERENCES pacientes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_frequencia_profissional
    FOREIGN KEY (id_profissional) REFERENCES usuarios(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_frequencia_atividade
    FOREIGN KEY (id_atividade) REFERENCES atividades_atendimento(id)
    ON DELETE RESTRICT,
  INDEX idx_frequencia_paciente (id_paciente),
  INDEX idx_frequencia_profissional (id_profissional),
  INDEX idx_frequencia_atividade (id_atividade),
  INDEX idx_frequencia_registrado_em (registrado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- CALENDARIO DE FREQUENCIA POR SEMESTRE
-- ---------------------------------------------------------------------
CREATE TABLE periodos_letivos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ano            SMALLINT NOT NULL,
  semestre       TINYINT NOT NULL,
  data_inicio    DATE NOT NULL,
  data_fim       DATE NOT NULL,
  status         ENUM('PLANEJADO','ATIVO','ENCERRADO') NOT NULL DEFAULT 'PLANEJADO',
  em_historico   BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_periodos_letivos_ano_semestre (ano, semestre),
  CONSTRAINT chk_periodos_letivos_semestre
    CHECK (semestre IN (1, 2)),
  CONSTRAINT chk_periodos_letivos_datas
    CHECK (data_inicio <= data_fim),
  INDEX idx_periodos_letivos_datas (data_inicio, data_fim),
  INDEX idx_periodos_letivos_status (status),
  INDEX idx_periodos_letivos_historico (em_historico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE grade_periodo_letivo (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_periodo     INT NOT NULL,
  id_curso       INT NOT NULL,
  id_atividade   INT NULL,
  dia_semana     TINYINT NOT NULL COMMENT '1=segunda ... 7=domingo',
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_grade_periodo_letivo_periodo
    FOREIGN KEY (id_periodo) REFERENCES periodos_letivos(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_grade_periodo_letivo_curso
    FOREIGN KEY (id_curso) REFERENCES cursos(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_grade_periodo_letivo_atividade
    FOREIGN KEY (id_atividade) REFERENCES atividades_atendimento(id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_grade_periodo_dia_semana
    CHECK (dia_semana BETWEEN 1 AND 7),
  INDEX idx_grade_periodo_dia (id_periodo, dia_semana),
  INDEX idx_grade_curso (id_periodo, id_curso),
  INDEX idx_grade_atividade (id_periodo, id_atividade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE excecoes_periodo_letivo (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_periodo     INT NOT NULL,
  id_grade       INT NULL COMMENT 'NULL = CAIGE inteiro; preenchido = atendimento especifico',
  data           DATE NOT NULL,
  motivo         VARCHAR(255) NULL,
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_excecoes_periodo_letivo_periodo
    FOREIGN KEY (id_periodo) REFERENCES periodos_letivos(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_excecoes_periodo_letivo_grade
    FOREIGN KEY (id_grade) REFERENCES grade_periodo_letivo(id)
    ON DELETE CASCADE,
  INDEX idx_excecoes_periodo_data (id_periodo, data),
  INDEX idx_excecoes_grade_data (id_grade, data)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- PERGUNTAS REUTILIZAVEIS
-- id_curso representa o curso principal; perguntas_cursos guarda todos
-- os vinculos interdisciplinares.
-- ---------------------------------------------------------------------
CREATE TABLE perguntas (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  titulo         VARCHAR(255) NOT NULL,
  descricao      TEXT NULL,
  tipo_pergunta  ENUM('texto_livre','multipla_escolha','sim_nao','escala')
                 NOT NULL DEFAULT 'texto_livre',
  opcoes         JSON NULL,
  criado_por     INT NOT NULL,
  id_curso       INT NOT NULL,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_perguntas_criado_por
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_perguntas_curso_principal
    FOREIGN KEY (id_curso) REFERENCES cursos(id)
    ON DELETE RESTRICT,
  INDEX idx_perguntas_curso_ativo (id_curso, ativo),
  INDEX idx_perguntas_criado_por (criado_por),
  INDEX idx_perguntas_tipo (tipo_pergunta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE perguntas_cursos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  id_pergunta INT NOT NULL,
  id_curso    INT NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_perguntas_cursos_pergunta
    FOREIGN KEY (id_pergunta) REFERENCES perguntas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_perguntas_cursos_curso
    FOREIGN KEY (id_curso) REFERENCES cursos(id)
    ON DELETE RESTRICT,
  UNIQUE KEY uq_pergunta_curso (id_pergunta, id_curso),
  INDEX idx_perguntas_cursos_curso_ativo (id_curso, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- PRONTUARIOS / QUESTIONARIOS
-- ---------------------------------------------------------------------
CREATE TABLE questionarios (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  titulo         VARCHAR(255) NOT NULL,
  descricao      TEXT NULL,
  id_curso       INT NOT NULL,
  criado_por     INT NOT NULL,
  publicado      BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_questionarios_curso
    FOREIGN KEY (id_curso) REFERENCES cursos(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_questionarios_criado_por
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
    ON DELETE RESTRICT,
  INDEX idx_questionarios_curso_publicado (id_curso, publicado),
  INDEX idx_questionarios_criado_por (criado_por)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE questoes_questionarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  id_questionario INT NOT NULL,
  id_pergunta     INT NOT NULL,
  ordem_pergunta  INT NOT NULL DEFAULT 0,
  disposicao      ENUM('automatico','linha_inteira','lado_a_lado') NOT NULL DEFAULT 'automatico',
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_questao_questionario (id_questionario, id_pergunta),
  CONSTRAINT fk_questoes_questionarios_questionario
    FOREIGN KEY (id_questionario) REFERENCES questionarios(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_questoes_questionarios_pergunta
    FOREIGN KEY (id_pergunta) REFERENCES perguntas(id)
    ON DELETE RESTRICT,
  INDEX idx_questoes_questionarios_ordem (id_questionario, ordem_pergunta),
  INDEX idx_questoes_questionarios_ativo (id_questionario, ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE respostas_questionarios (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  id_paciente         INT NOT NULL,
  id_questionario     INT NOT NULL,
  id_profissional     INT NULL,
  dados_resposta      JSON NOT NULL,
  estrutura_snapshot  JSON NULL,
  respondido_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  criado_em           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_respostas_paciente
    FOREIGN KEY (id_paciente) REFERENCES pacientes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_respostas_questionario
    FOREIGN KEY (id_questionario) REFERENCES questionarios(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_respostas_profissional
    FOREIGN KEY (id_profissional) REFERENCES usuarios(id)
    ON DELETE SET NULL,
  INDEX idx_respostas_paciente_questionario (id_paciente, id_questionario),
  INDEX idx_respostas_profissional (id_profissional),
  INDEX idx_respostas_respondido_em (respondido_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- MOVIMENTACOES DO SISTEMA / DASHBOARD
-- ---------------------------------------------------------------------
CREATE TABLE movimentacoes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario    INT NULL,
  id_paciente   INT NULL,
  id_curso      INT NULL,
  id_atividade  INT NULL,
  tipo          VARCHAR(120) NOT NULL,
  descricao     VARCHAR(500) NOT NULL,
  criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimentacoes_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_movimentacoes_paciente
    FOREIGN KEY (id_paciente) REFERENCES pacientes(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_movimentacoes_curso
    FOREIGN KEY (id_curso) REFERENCES cursos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_movimentacoes_atividade
    FOREIGN KEY (id_atividade) REFERENCES atividades_atendimento(id)
    ON DELETE SET NULL,
  INDEX idx_movimentacoes_usuario (id_usuario),
  INDEX idx_movimentacoes_paciente (id_paciente),
  INDEX idx_movimentacoes_tipo (tipo),
  INDEX idx_movimentacoes_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- DADOS DE TESTE PARA HOMOLOGACAO DAS TELAS
-- Todos os usuarios abaixo usam a senha: suporte123
-- =====================================================================

INSERT INTO cursos (id, nome, ativo) VALUES
  (1, 'Agronomia', TRUE),
  (2, 'Educação Física', TRUE),
  (3, 'Enfermagem', TRUE),
  (4, 'Estética e Cosmética', TRUE),
  (5, 'Farmácia', TRUE),
  (6, 'Fisioterapia', TRUE),
  (7, 'Fonoaudiologia', TRUE),
  (8, 'Medicina', TRUE),
  (9, 'Nutrição', TRUE);

INSERT INTO permissoes
  (papel,
   pode_registrar_frequencia,
   pode_criar_paciente,
   pode_editar_paciente,
   pode_visualizar_paciente,
   pode_visualizar_relatorios,
   pode_visualizar_questionarios,
   pode_gerenciar_atividades)
VALUES
  ('SUPERVISOR', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('PROFESSOR',  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

-- Mesma senha para facilitar a homologacao: suporte123
-- Primeiro criamos o supervisor; depois os usuarios que o referenciam em criado_por.
INSERT INTO usuarios
  (id, email, senha_hash, nome, papel, id_curso, criado_por, ativo, oculto)
VALUES
  (1, 'suportecaige@univale.br',
   '$2a$10$Ji4DeFj5XiJePFMlwsMCRedwAYHg/uV/z8KOL72ZmCNKkslkQ/yXS',
   'Suporte CAIGE', 'SUPERVISOR', NULL, NULL, TRUE, FALSE);

INSERT INTO usuarios
  (id, email, senha_hash, nome, papel, id_curso, criado_por, ativo, oculto)
VALUES
  (2, 'fisioterapia.teste@univale.br',
   '$2a$10$Ji4DeFj5XiJePFMlwsMCRedwAYHg/uV/z8KOL72ZmCNKkslkQ/yXS',
   'Felipe Teste', 'PROFESSOR', 6, 1, TRUE, FALSE),
  (3, 'educacaofisica.teste@univale.br',
   '$2a$10$Ji4DeFj5XiJePFMlwsMCRedwAYHg/uV/z8KOL72ZmCNKkslkQ/yXS',
   'Mariana Teste', 'PROFESSOR', 2, 1, TRUE, FALSE),
  (4, 'nutricao.teste@univale.br',
   '$2a$10$Ji4DeFj5XiJePFMlwsMCRedwAYHg/uV/z8KOL72ZmCNKkslkQ/yXS',
   'Camila Teste', 'PROFESSOR', 9, 1, TRUE, FALSE),
  (5, 'enfermagem.teste@univale.br',
   '$2a$10$Ji4DeFj5XiJePFMlwsMCRedwAYHg/uV/z8KOL72ZmCNKkslkQ/yXS',
   'Rafael Teste', 'PROFESSOR', 3, 1, TRUE, FALSE),
  (6, 'arquivado.teste@univale.br',
   '$2a$10$Ji4DeFj5XiJePFMlwsMCRedwAYHg/uV/z8KOL72ZmCNKkslkQ/yXS',
   'Professor Arquivado', 'PROFESSOR', 6, 1, FALSE, TRUE);

-- Pacientes com combinacoes diferentes para testar lista, edicao e Resumo Clinico.
INSERT INTO pacientes
  (id, nome, data_nascimento, genero, cpf, telefone, celular, cep, rua, numero,
   bairro, cidade, estado, responsavel, parentesco_responsavel, telefone_responsavel,
   observacoes,
   condicoes_saude, condicoes_saude_avaliadas,
   alergias, alergias_avaliadas,
   medicamentos_uso, medicamentos_avaliados,
   observacoes_clinicas,
   peso_kg, altura_cm, status, oculto)
VALUES
  (
    1, 'Helena Martins', '1955-04-12', 'Feminino', '111.222.333-44',
    '(33) 3271-1001', '(33) 98888-1001', '35010-000', 'Rua das Acácias', '120',
    'Centro', 'Governador Valadares', 'MG', 'Carlos Martins', 'Filho', '(33) 98888-2001',
    'Paciente utilizada para testar prontuários interdisciplinares.',
    CONCAT('Hipertensão arterial', CHAR(10), 'Diabetes tipo 2'), TRUE,
    'Dipirona', TRUE,
    CONCAT('Metformina 850 mg', CHAR(10), 'Losartana 50 mg'), TRUE,
    'Acompanha fisioterapia e educação física. Relata melhora funcional progressiva.',
    72.40, 165.00, 'ativo', FALSE
  ),
  (
    2, 'Nelson Gonçalves', '1951-09-03', 'Masculino', '222.333.444-55',
    '(33) 3271-1002', '(33) 97777-1002', '35020-000', 'Avenida Minas Gerais', '450',
    'Lourdes', 'Governador Valadares', 'MG', 'Ana Gonçalves', 'Esposa', '(33) 97777-2002',
    'Paciente para testes de frequência.',
    'Artrose de joelho', TRUE,
    NULL, FALSE,
    'Paracetamol 750 mg', TRUE,
    'Necessita atenção em atividades de maior impacto.',
    81.20, 174.00, 'ativo', FALSE
  ),
  (
    3, 'Maria das Graças Souza', '1948-01-25', 'Feminino', '333.444.555-66',
    '(33) 3271-1003', '(33) 96666-1003', '35030-000', 'Rua Sete de Setembro', '88',
    'São Pedro', 'Governador Valadares', 'MG', 'Luciana Souza', 'Filha', '(33) 96666-2003',
    NULL,
    CONCAT('Osteoporose', CHAR(10), 'Hipotireoidismo'), TRUE,
    CONCAT('Penicilina', CHAR(10), 'Frutos do mar'), TRUE,
    CONCAT('Levotiroxina 50 mcg', CHAR(10), 'Cálcio + Vitamina D'), TRUE,
    'Teste de múltiplos itens no Resumo Clínico.',
    59.80, 158.00, 'ativo', FALSE
  ),
  (
    4, 'João Batista Lima', '1959-06-17', 'Masculino', '444.555.666-77',
    '(33) 3271-1004', NULL, '35040-000', 'Rua Afonso Pena', '305',
    'Esplanada', 'Governador Valadares', 'MG', 'Paulo Lima', 'Filho', '(33) 95555-2004',
    'Paciente inativo para validar filtros de status.',
    NULL, FALSE,
    NULL, FALSE,
    NULL, FALSE,
    NULL,
    76.00, 169.00, 'inativo', FALSE
  ),
  (
    5, 'Tereza Oliveira', '1953-11-08', 'Feminino', '555.666.777-88',
    NULL, '(33) 94444-1005', '35050-000', 'Rua Israel Pinheiro', '910',
    'Grã-Duquesa', 'Governador Valadares', 'MG', 'Marcos Oliveira', 'Filho', '(33) 94444-2005',
    'Paciente sem dados clínicos completos para testar estados vazios.',
    NULL, FALSE,
    NULL, FALSE,
    NULL, FALSE,
    NULL,
    NULL, NULL, 'ativo', FALSE
  ),
  (
    6, 'Paciente Arquivado', '1950-02-14', 'Masculino', '666.777.888-99',
    '(33) 3271-1006', NULL, '35060-000', 'Rua de Teste', '10',
    'Centro', 'Governador Valadares', 'MG', 'Responsável Teste', 'Filho', '(33) 93333-2006',
    'Registro usado para validar a aba de pacientes arquivados.',
    NULL, FALSE,
    NULL, FALSE,
    NULL, FALSE,
    NULL,
    NULL, NULL, 'arquivado', FALSE
  ),
  (
    7, 'Paciente Ocultado', '1945-08-20', 'Feminino', '777.888.999-00',
    '(33) 3271-1007', NULL, '35070-000', 'Rua Invisível', '20',
    'Centro', 'Governador Valadares', 'MG', 'Responsável Teste 2', 'Filho', '(33) 92222-2007',
    'Registro ocultado definitivamente da interface para validações relacionais.',
    NULL, FALSE,
    NULL, FALSE,
    NULL, FALSE,
    NULL,
    NULL, NULL, 'arquivado', TRUE
  );

-- Atividades de atendimento.
INSERT INTO atividades_atendimento
  (id, id_curso, nome, descricao, ativo)
VALUES
  (1, 6, 'Fisioterapia Funcional', 'Exercícios de mobilidade, equilíbrio e funcionalidade.', TRUE),
  (2, 6, 'Alongamento Terapêutico', 'Sessão orientada de alongamentos.', TRUE),
  (3, 2, 'Hidroginástica', 'Atividade aquática coletiva.', TRUE),
  (4, 2, 'Ginástica Funcional', 'Atividade física funcional em grupo.', TRUE),
  (5, 9, 'Acompanhamento Nutricional', 'Orientação e acompanhamento nutricional.', TRUE),
  (6, 3, 'Educação em Saúde', 'Atividade educativa de enfermagem.', TRUE);

-- Frequencias: algumas de hoje para alimentar Dashboard e outras historicas.
INSERT INTO frequencia
  (id, id_paciente, id_profissional, id_atividade, observacoes, registrado_em)
VALUES
  (1, 1, 2, 1, 'Boa participação.', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (2, 2, 3, 3, 'Participou sem intercorrências.', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (3, 3, 4, 5, 'Retorno nutricional.', DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
  (4, 1, 3, 4, 'Atividade concluída.', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (5, 2, 2, 2, NULL, DATE_SUB(NOW(), INTERVAL 14 DAY));

-- Perguntas cobrindo os quatro tipos.
INSERT INTO perguntas
  (id, titulo, descricao, tipo_pergunta, opcoes, criado_por, id_curso, ativo)
VALUES
  (1, 'O paciente sente dor ao caminhar?', 'Considere a rotina atual do paciente.', 'sim_nao', NULL, 2, 6, TRUE),
  (2, 'Qual o nível atual de dor?', 'Escala de 1 a 5.', 'escala', NULL, 2, 6, TRUE),
  (3, 'Descreva a principal limitação funcional.', 'Use um texto curto e objetivo.', 'texto_livre', NULL, 2, 6, TRUE),
  (4, 'Qual atividade gera maior conforto?', 'Selecione uma alternativa.',
   'multipla_escolha',
   JSON_OBJECT('options', JSON_ARRAY('Caminhada', 'Hidroginástica', 'Alongamento', 'Exercício sentado')),
   2, 6, TRUE),
  (5, 'Há risco de queda durante a atividade?', 'Pergunta compartilhada entre cursos.', 'sim_nao', NULL, 2, 6, TRUE),
  (6, 'Como foi a participação na atividade?', 'Selecione a percepção predominante.',
   'multipla_escolha',
   JSON_OBJECT('options', JSON_ARRAY('Ótima', 'Boa', 'Regular', 'Baixa')),
   3, 2, TRUE),
  (7, 'Descreva a evolução percebida.', 'Registro livre do profissional.', 'texto_livre', NULL, 3, 2, TRUE),
  (8, 'Como está o apetite atualmente?', 'Selecione a alternativa mais adequada.',
   'multipla_escolha',
   JSON_OBJECT('options', JSON_ARRAY('Preservado', 'Reduzido', 'Aumentado', 'Oscilante')),
   4, 9, TRUE),
  (9, 'Qual a adesão às orientações nutricionais?', 'Escala de 1 a 5.', 'escala', NULL, 4, 9, TRUE);

-- Vinculos interdisciplinares.
INSERT INTO perguntas_cursos (id, id_pergunta, id_curso, ativo) VALUES
  (1, 1, 6, TRUE),
  (2, 2, 6, TRUE),
  (3, 3, 6, TRUE),
  (4, 4, 6, TRUE),
  (5, 5, 6, TRUE),
  (6, 5, 2, TRUE),
  (7, 6, 2, TRUE),
  (8, 7, 2, TRUE),
  (9, 8, 9, TRUE),
  (10, 9, 9, TRUE);

INSERT INTO questionarios
  (id, titulo, descricao, id_curso, criado_por, publicado)
VALUES
  (1, 'Avaliação Funcional', 'Prontuário para acompanhamento funcional do paciente.', 6, 2, TRUE),
  (2, 'Avaliação de Atividade Física', 'Registro de evolução nas atividades de Educação Física.', 2, 3, TRUE),
  (3, 'Triagem Nutricional', 'Acompanhamento nutricional periódico.', 9, 4, TRUE);

INSERT INTO questoes_questionarios
  (id, id_questionario, id_pergunta, ordem_pergunta, ativo)
VALUES
  (1, 1, 1, 1, TRUE),
  (2, 1, 2, 2, TRUE),
  (3, 1, 3, 3, TRUE),
  (4, 1, 4, 4, TRUE),
  (5, 1, 5, 5, TRUE),
  (6, 2, 5, 1, TRUE),
  (7, 2, 6, 2, TRUE),
  (8, 2, 7, 3, TRUE),
  (9, 3, 8, 1, TRUE),
  (10, 3, 9, 2, TRUE);

-- Dois lancamentos do mesmo prontuario para testar "Comparar lancamentos".
INSERT INTO respostas_questionarios
  (id, id_paciente, id_questionario, id_profissional, dados_resposta, estrutura_snapshot,
   respondido_em, criado_em)
VALUES
  (
    1, 1, 1, 2,
    JSON_OBJECT(
      '1', JSON_OBJECT('titulo','O paciente sente dor ao caminhar?','descricao','Considere a rotina atual do paciente.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',1,'resposta','sim'),
      '2', JSON_OBJECT('titulo','Qual o nível atual de dor?','descricao','Escala de 1 a 5.','tipo_pergunta','escala','opcoes_snapshot',NULL,'ordem_pergunta',2,'resposta','4'),
      '3', JSON_OBJECT('titulo','Descreva a principal limitação funcional.','descricao','Use um texto curto e objetivo.','tipo_pergunta','texto_livre','opcoes_snapshot',NULL,'ordem_pergunta',3,'resposta','Dificuldade para caminhar por períodos longos.'),
      '4', JSON_OBJECT('titulo','Qual atividade gera maior conforto?','descricao','Selecione uma alternativa.','tipo_pergunta','multipla_escolha','opcoes_snapshot',JSON_OBJECT('options',JSON_ARRAY('Caminhada','Hidroginástica','Alongamento','Exercício sentado')),'ordem_pergunta',4,'resposta','Hidroginástica'),
      '5', JSON_OBJECT('titulo','Há risco de queda durante a atividade?','descricao','Pergunta compartilhada entre cursos.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',5,'resposta','sim')
    ),
    JSON_OBJECT(
      'versao',1,
      'questionario',JSON_OBJECT('id',1,'titulo','Avaliação Funcional','descricao','Prontuário para acompanhamento funcional do paciente.','id_curso',6,'curso_nome','Fisioterapia'),
      'perguntas',JSON_ARRAY(
        JSON_OBJECT('id',1,'titulo','O paciente sente dor ao caminhar?','descricao','Considere a rotina atual do paciente.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',1),
        JSON_OBJECT('id',2,'titulo','Qual o nível atual de dor?','descricao','Escala de 1 a 5.','tipo_pergunta','escala','opcoes_snapshot',NULL,'ordem_pergunta',2),
        JSON_OBJECT('id',3,'titulo','Descreva a principal limitação funcional.','descricao','Use um texto curto e objetivo.','tipo_pergunta','texto_livre','opcoes_snapshot',NULL,'ordem_pergunta',3),
        JSON_OBJECT('id',4,'titulo','Qual atividade gera maior conforto?','descricao','Selecione uma alternativa.','tipo_pergunta','multipla_escolha','opcoes_snapshot',JSON_OBJECT('options',JSON_ARRAY('Caminhada','Hidroginástica','Alongamento','Exercício sentado')),'ordem_pergunta',4),
        JSON_OBJECT('id',5,'titulo','Há risco de queda durante a atividade?','descricao','Pergunta compartilhada entre cursos.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',5)
      ),
      'registro',JSON_OBJECT('id_profissional',2,'profissional_nome','Felipe Teste')
    ),
    DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY)
  ),
  (
    2, 1, 1, 2,
    JSON_OBJECT(
      '1', JSON_OBJECT('titulo','O paciente sente dor ao caminhar?','descricao','Considere a rotina atual do paciente.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',1,'resposta','nao'),
      '2', JSON_OBJECT('titulo','Qual o nível atual de dor?','descricao','Escala de 1 a 5.','tipo_pergunta','escala','opcoes_snapshot',NULL,'ordem_pergunta',2,'resposta','2'),
      '3', JSON_OBJECT('titulo','Descreva a principal limitação funcional.','descricao','Use um texto curto e objetivo.','tipo_pergunta','texto_livre','opcoes_snapshot',NULL,'ordem_pergunta',3,'resposta','Apresenta melhora da resistência e maior segurança ao caminhar.'),
      '4', JSON_OBJECT('titulo','Qual atividade gera maior conforto?','descricao','Selecione uma alternativa.','tipo_pergunta','multipla_escolha','opcoes_snapshot',JSON_OBJECT('options',JSON_ARRAY('Caminhada','Hidroginástica','Alongamento','Exercício sentado')),'ordem_pergunta',4,'resposta','Caminhada'),
      '5', JSON_OBJECT('titulo','Há risco de queda durante a atividade?','descricao','Pergunta compartilhada entre cursos.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',5,'resposta','nao')
    ),
    JSON_OBJECT(
      'versao',1,
      'questionario',JSON_OBJECT('id',1,'titulo','Avaliação Funcional','descricao','Prontuário para acompanhamento funcional do paciente.','id_curso',6,'curso_nome','Fisioterapia'),
      'perguntas',JSON_ARRAY(
        JSON_OBJECT('id',1,'titulo','O paciente sente dor ao caminhar?','descricao','Considere a rotina atual do paciente.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',1),
        JSON_OBJECT('id',2,'titulo','Qual o nível atual de dor?','descricao','Escala de 1 a 5.','tipo_pergunta','escala','opcoes_snapshot',NULL,'ordem_pergunta',2),
        JSON_OBJECT('id',3,'titulo','Descreva a principal limitação funcional.','descricao','Use um texto curto e objetivo.','tipo_pergunta','texto_livre','opcoes_snapshot',NULL,'ordem_pergunta',3),
        JSON_OBJECT('id',4,'titulo','Qual atividade gera maior conforto?','descricao','Selecione uma alternativa.','tipo_pergunta','multipla_escolha','opcoes_snapshot',JSON_OBJECT('options',JSON_ARRAY('Caminhada','Hidroginástica','Alongamento','Exercício sentado')),'ordem_pergunta',4),
        JSON_OBJECT('id',5,'titulo','Há risco de queda durante a atividade?','descricao','Pergunta compartilhada entre cursos.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',5)
      ),
      'registro',JSON_OBJECT('id_profissional',2,'profissional_nome','Felipe Teste')
    ),
    DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY)
  ),
  (
    3, 1, 2, 3,
    JSON_OBJECT(
      '5', JSON_OBJECT('titulo','Há risco de queda durante a atividade?','descricao','Pergunta compartilhada entre cursos.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',1,'resposta','nao'),
      '6', JSON_OBJECT('titulo','Como foi a participação na atividade?','descricao','Selecione a percepção predominante.','tipo_pergunta','multipla_escolha','opcoes_snapshot',JSON_OBJECT('options',JSON_ARRAY('Ótima','Boa','Regular','Baixa')),'ordem_pergunta',2,'resposta','Ótima'),
      '7', JSON_OBJECT('titulo','Descreva a evolução percebida.','descricao','Registro livre do profissional.','tipo_pergunta','texto_livre','opcoes_snapshot',NULL,'ordem_pergunta',3,'resposta','Maior autonomia e boa adesão às atividades.')
    ),
    JSON_OBJECT(
      'versao',1,
      'questionario',JSON_OBJECT('id',2,'titulo','Avaliação de Atividade Física','descricao','Registro de evolução nas atividades de Educação Física.','id_curso',2,'curso_nome','Educação Física'),
      'perguntas',JSON_ARRAY(
        JSON_OBJECT('id',5,'titulo','Há risco de queda durante a atividade?','descricao','Pergunta compartilhada entre cursos.','tipo_pergunta','sim_nao','opcoes_snapshot',NULL,'ordem_pergunta',1),
        JSON_OBJECT('id',6,'titulo','Como foi a participação na atividade?','descricao','Selecione a percepção predominante.','tipo_pergunta','multipla_escolha','opcoes_snapshot',JSON_OBJECT('options',JSON_ARRAY('Ótima','Boa','Regular','Baixa')),'ordem_pergunta',2),
        JSON_OBJECT('id',7,'titulo','Descreva a evolução percebida.','descricao','Registro livre do profissional.','tipo_pergunta','texto_livre','opcoes_snapshot',NULL,'ordem_pergunta',3)
      ),
      'registro',JSON_OBJECT('id_profissional',3,'profissional_nome','Mariana Teste')
    ),
    DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)
  ),
  (
    4, 3, 3, 4,
    JSON_OBJECT(
      '8', JSON_OBJECT('titulo','Como está o apetite atualmente?','descricao','Selecione a alternativa mais adequada.','tipo_pergunta','multipla_escolha','opcoes_snapshot',JSON_OBJECT('options',JSON_ARRAY('Preservado','Reduzido','Aumentado','Oscilante')),'ordem_pergunta',1,'resposta','Preservado'),
      '9', JSON_OBJECT('titulo','Qual a adesão às orientações nutricionais?','descricao','Escala de 1 a 5.','tipo_pergunta','escala','opcoes_snapshot',NULL,'ordem_pergunta',2,'resposta','4')
    ),
    JSON_OBJECT(
      'versao',1,
      'questionario',JSON_OBJECT('id',3,'titulo','Triagem Nutricional','descricao','Acompanhamento nutricional periódico.','id_curso',9,'curso_nome','Nutrição'),
      'perguntas',JSON_ARRAY(
        JSON_OBJECT('id',8,'titulo','Como está o apetite atualmente?','descricao','Selecione a alternativa mais adequada.','tipo_pergunta','multipla_escolha','opcoes_snapshot',JSON_OBJECT('options',JSON_ARRAY('Preservado','Reduzido','Aumentado','Oscilante')),'ordem_pergunta',1),
        JSON_OBJECT('id',9,'titulo','Qual a adesão às orientações nutricionais?','descricao','Escala de 1 a 5.','tipo_pergunta','escala','opcoes_snapshot',NULL,'ordem_pergunta',2)
      ),
      'registro',JSON_OBJECT('id_profissional',4,'profissional_nome','Camila Teste')
    ),
    DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)
  );

-- Movimentacoes recentes para Dashboard.
INSERT INTO movimentacoes
  (id, id_usuario, id_paciente, id_curso, id_atividade, tipo, descricao, criado_em)
VALUES
  (1, 2, 1, 6, 1, 'Frequência registrada', 'Helena Martins participou de Fisioterapia Funcional', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (2, 3, 2, 2, 3, 'Frequência registrada', 'Nelson Gonçalves participou de Hidroginástica', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (3, 4, 3, 9, 5, 'Frequência registrada', 'Maria das Graças Souza participou de Acompanhamento Nutricional', DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
  (4, 2, 1, 6, NULL, 'Avaliação realizada', 'Avaliação Funcional realizada para Helena Martins', DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (5, 1, 5, NULL, NULL, 'Paciente cadastrado', 'Paciente Tereza Oliveira cadastrado', DATE_SUB(NOW(), INTERVAL 1 DAY));

ALTER TABLE cursos AUTO_INCREMENT = 10;
ALTER TABLE usuarios AUTO_INCREMENT = 7;
ALTER TABLE pacientes AUTO_INCREMENT = 7;
ALTER TABLE atividades_atendimento AUTO_INCREMENT = 7;
ALTER TABLE frequencia AUTO_INCREMENT = 6;
ALTER TABLE perguntas AUTO_INCREMENT = 10;
ALTER TABLE perguntas_cursos AUTO_INCREMENT = 11;
ALTER TABLE questionarios AUTO_INCREMENT = 4;
ALTER TABLE questoes_questionarios AUTO_INCREMENT = 11;
ALTER TABLE respostas_questionarios AUTO_INCREMENT = 5;
ALTER TABLE movimentacoes AUTO_INCREMENT = 6;

-- Conferencia rapida ao final.
SELECT 'Banco CAIGE de TESTE criado com sucesso.' AS resultado;
SELECT COUNT(*) AS usuarios FROM usuarios;
SELECT COUNT(*) AS pacientes FROM pacientes;
SELECT COUNT(*) AS frequencias FROM frequencia;
SELECT COUNT(*) AS perguntas FROM perguntas;
SELECT COUNT(*) AS prontuarios FROM questionarios;
SELECT COUNT(*) AS lancamentos FROM respostas_questionarios;
