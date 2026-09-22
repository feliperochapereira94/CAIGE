import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

export function resolverCaminhoOpenApi(baseDir) {
  return path.resolve(baseDir, "../../docs/api/openapi.yaml");
}

export function carregarDocumentoOpenApi(caminhoYaml) {
  const conteudo = fs.readFileSync(caminhoYaml, "utf8");
  return YAML.parse(conteudo);
}

export function criarMiddlewaresSwagger(documentoOpenApi) {
  return swaggerUi.serve.concat(
    swaggerUi.setup(documentoOpenApi, {
      explorer: true,
      swaggerOptions: {
        docExpansion: "list",
        displayRequestDuration: true,
        defaultModelsExpandDepth: 1
      }
    })
  );
}
