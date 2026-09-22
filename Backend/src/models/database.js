import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

console.log(`Conectando ao banco: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306} | User: ${process.env.DB_USER} | DB: ${process.env.DB_NAME}`);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const HARD_DELETE_PATTERN = /\bDELETE\s+FROM\s+(?:`?[A-Za-z0-9_$]+`?\.)?`?([A-Za-z0-9_$]+)`?/i;

// Entidades que usam arquivamento/desativacao logica ou preservam historico.
// Exclusoes fisicas continuam permitidas apenas nas tabelas em que o fluxo
// atual realmente exige remocao (ex.: grade/excecoes, atividade sem uso,
// curso sem vinculos e questionario sem respostas).
const HARD_DELETE_PROTECTED_TABLES = new Set([
  'usuarios',
  'pacientes',
  'frequencia',
  'movimentacoes',
  'perguntas',
  'perguntas_cursos',
  'respostas_questionarios',
  'periodos_letivos'
]);

function getSqlText(sql) {
  if (typeof sql === 'string') return sql;
  if (sql && typeof sql.sql === 'string') return sql.sql;
  return '';
}

function assertHardDeleteAllowed(sql) {
  const sqlText = getSqlText(sql);
  if (!sqlText) return;

  const match = HARD_DELETE_PATTERN.exec(sqlText);
  if (!match) return;

  const tableName = match[1].toLowerCase();
  if (HARD_DELETE_PROTECTED_TABLES.has(tableName)) {
    throw new Error(
      `Operacao bloqueada: exclusao fisica da tabela protegida "${tableName}" nao e permitida. Use o fluxo de arquivamento/desativacao.`
    );
  }
}

function guardDatabaseObject(target) {
  return new Proxy(target, {
    get(currentTarget, prop) {
      if (prop === 'query' || prop === 'execute') {
        return async (...args) => {
          assertHardDeleteAllowed(args[0]);
          return currentTarget[prop](...args);
        };
      }

      const value = currentTarget[prop];
      return typeof value === 'function' ? value.bind(currentTarget) : value;
    }
  });
}

const guardedPool = new Proxy(pool, {
  get(target, prop) {
    if (prop === 'query' || prop === 'execute') {
      return async (...args) => {
        assertHardDeleteAllowed(args[0]);
        return target[prop](...args);
      };
    }

    if (prop === 'getConnection') {
      return async (...args) => {
        const connection = await target.getConnection(...args);
        return guardDatabaseObject(connection);
      };
    }

    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  }
});

// Testar conexao
pool.getConnection()
  .then((connection) => {
    console.log("Conexao com banco de dados estabelecida com sucesso!");
    connection.release();
  })
  .catch((err) => {
    console.error("Erro ao conectar com o banco de dados", err);
  });

export default guardedPool;

