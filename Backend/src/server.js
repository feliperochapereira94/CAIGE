import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { carregarDocumentoOpenApi, criarMiddlewaresSwagger, resolverCaminhoOpenApi } from "./swagger.js";

import rotasAutenticacao from "./routes/autenticacao.js";
import rotasUsuarios from "./routes/usuarios.js";
import rotasPacientes from "./routes/pacientes.js";
import rotasDadosPainel from "./routes/dados-painel.js";
import rotasFrequencia from "./routes/frequencia.js";
import rotasArquivo from "./routes/arquivo.js";
import rotasQuestionarios from "./routes/questionarios.js";
import rotasCursos from "./routes/cursos.js";
import rotasAtividadesAtendimento from "./routes/atividades-atendimento.js";
import rotasMovimentacoes from "./routes/movimentacoes.js";
import rotasPeriodosLetivos from "./routes/periodos-letivos.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../../Frontend");
const faviconPath = path.join(frontendPath, "recursos/images/logo-caige.png");
const openApiPath = resolverCaminhoOpenApi(__dirname);
const openApiDocument = carregarDocumentoOpenApi(openApiPath);

console.log("=== INICIANDO SERVIDOR CAIGE ===");
console.log(`Porta: ${PORT}`);
console.log(`Ambiente NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Arquivos estáticos - ANTES do registrador de requisições
app.use(express.static(frontendPath));

app.use("/api-docs", ...criarMiddlewaresSwagger(openApiDocument));

// Registro de requisições - DEPOIS dos arquivos estáticos
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`-> ${req.method} ${req.path} | IP: ${req.ip}`);

  const originalJson = res.json;
  res.json = function patchedJson(data) {
    const duration = Date.now() - startTime;
    console.log(`<- ${req.method} ${req.path} | Status: ${res.statusCode} | ${duration}ms`);
    return originalJson.call(this, data);
  };

  next();
});

console.log("Middleware configurado");

// Rotas
app.use("/api/autenticacao", rotasAutenticacao);
app.use("/api/usuarios", rotasUsuarios);
app.use("/api/pacientes", rotasPacientes);
app.use("/api/dados-painel", rotasDadosPainel);
app.use("/api/frequencia", rotasFrequencia);
app.use("/api/arquivo", rotasArquivo);
app.use("/api/questionarios", rotasQuestionarios);
app.use("/api/cursos", rotasCursos);
app.use("/api/atividades-atendimento", rotasAtividadesAtendimento);
app.use("/api/movimentacoes", rotasMovimentacoes);
app.use("/api/periodos-letivos", rotasPeriodosLetivos);

console.log("Rotas configuradas");

// Rota de raiz - serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Evita 404 do navegador para favicon.ico
app.get("/favicon.ico", (req, res) => {
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
    return;
  }
  res.status(204).end();
});

// Tratamento de rota não encontrada - ÚLTIMO
app.use((req, res) => {
  console.error(`Rota não encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ message: "Rota não encontrada." });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error(`Erro não tratado: ${err.message}`, err);
  res.status(500).json({ message: "Erro interno do servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado com sucesso em http://localhost:${PORT}`);
});
