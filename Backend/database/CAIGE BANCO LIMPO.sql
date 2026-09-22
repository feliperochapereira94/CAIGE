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
-- DADOS MINIMOS PARA IMPLANTACAO
-- Sem pacientes, frequencias, prontuarios ou dados clinicos de teste.
-- =====================================================================

-- Cursos institucionais usados pelo CAIGE.
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

-- Permissoes padrao dos perfis.
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

-- Usuario tecnico/supervisor inicial.
-- Senha atual do projeto: suporte123
-- IMPORTANTE: altere a senha apos o primeiro acesso em producao.
INSERT INTO usuarios
  (id, email, senha_hash, nome, papel, id_curso, ativo, oculto)
VALUES
  (
    1,
    'suportecaige@univale.br',
    '$2a$10$Ji4DeFj5XiJePFMlwsMCRedwAYHg/uV/z8KOL72ZmCNKkslkQ/yXS',
    'Suporte CAIGE',
    'SUPERVISOR',
    NULL,
    TRUE,
    FALSE
  );

ALTER TABLE cursos AUTO_INCREMENT = 10;
ALTER TABLE usuarios AUTO_INCREMENT = 2;

-- Conferencia rapida.
SELECT 'Banco CAIGE limpo criado com sucesso.' AS resultado;
SELECT COUNT(*) AS cursos_configurados FROM cursos;
SELECT COUNT(*) AS usuarios_iniciais FROM usuarios;
