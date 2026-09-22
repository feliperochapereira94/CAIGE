# Arquitetura do CAIGE

## 1. Visão geral
O CAIGE segue uma arquitetura web em três camadas principais:

1. **Frontend**: interface do usuário;
2. **Backend**: API e regras de negócio;
3. **Banco de Dados**: persistência em MySQL.

Fluxo simplificado:

```text
Usuário → Frontend → Backend/API → MySQL → Backend → Frontend
```

## 2. Frontend
### Estrutura
O frontend está localizado em `Frontend/` e é composto por:
- `paginas/`: telas do sistema;
- `recursos/css/`: estilos globais e por página;
- `recursos/js/`: scripts utilitários e módulos de interface;
- `recursos/images/`: logos e imagens;
- `recursos/uploads/pacientes/`: fotos WebP dos pacientes, nomeadas pelo ID;
- `manifest.webmanifest`: metadados de instalação PWA;
- `service-worker.js`: cache controlado de recursos estáticos.

### Shell Global
As páginas autenticadas utilizam o **Shell Global** como base estrutural, concentrando:
- sidebar;
- cabeçalho;
- avatar/menu do usuário;
- navegação principal;
- comportamento responsivo compartilhado em desktop, tablet e mobile.

Arquivos centrais:
- `Frontend/recursos/js/shell-global.js`
- `Frontend/recursos/js/sidebar-menu.js`
- `Frontend/recursos/js/menu-usuario.js`
- `Frontend/recursos/js/controle-acesso.js`

### Foto do paciente
A foto é tratada como arquivo estático controlado, não como coluna/BLOB do MySQL. O fluxo atual é:

```text
JPG/PNG/WebP selecionado no navegador
→ recorte em Canvas 320 × 320
→ Data URL WebP otimizado
→ POST /api/pacientes/{id}/foto
→ Frontend/recursos/uploads/pacientes/{id}.webp
→ resposta da API expõe `photo`/`path`
```

Sem arquivo WebP correspondente, a interface utiliza as iniciais do paciente como fallback. A remoção usa `DELETE /api/pacientes/{id}/foto`.

### PWA
O CAIGE possui Web App Manifest e Service Worker. O cache é restrito a recursos estáticos da interface; requisições de `/api/` e arquivos de `/recursos/uploads/` são explicitamente excluídos.

## 3. Backend
### Estrutura
O backend está em `Backend/`.

Arquivos principais:
- `Backend/src/server.js`: inicialização do servidor;
- `Backend/src/swagger.js`: integração com OpenAPI/Swagger;
- `Backend/src/routes/`: definição de rotas;
- `Backend/src/controllers/`: regras de negócio por módulo;
- `Backend/src/models/`: acesso a dados.

### Responsabilidades do backend
- autenticação e autorização;
- validação de acesso por perfil;
- regras de negócio de pacientes, frequência, prontuários e administração;
- integração com banco de dados;
- publicação da documentação da API;
- entrega dos arquivos estáticos do frontend pelo mesmo processo Node.js;
- gravação/remoção controlada das fotos WebP de pacientes mediante permissão `pode_editar_paciente`.

## 4. Banco de dados
O banco é MySQL e a base estrutural fica em `Backend/database/`.

A V1 final trabalha com as tabelas operacionais atuais, incluindo:
- `usuarios`
- `permissoes`
- `cursos`
- `pacientes`
- `atividades_atendimento`
- `frequencia`
- `periodos_letivos`
- `grade_periodo_letivo`
- `excecoes_periodo_letivo`
- `perguntas`
- `perguntas_cursos`
- `questionarios`
- `questoes_questionarios`
- `respostas_questionarios`
- `movimentacoes`

## 5. API
A comunicação entre frontend e backend ocorre por API HTTP/JSON.

Prefixo base das rotas:
- `/api/autenticacao`
- `/api/usuarios`
- `/api/pacientes`
- `/api/dados-painel`
- `/api/frequencia`
- `/api/arquivo`
- `/api/questionarios`
- `/api/cursos`
- `/api/atividades-atendimento`
- `/api/movimentacoes`
- `/api/periodos-letivos`

Documentação interativa:
- `/api-docs`

## 6. Segurança
- autenticação com JWT;
- uso de middleware para proteção de rotas;
- validação de perfil/permissão no backend;
- restrição de professor ao curso vinculado em fluxos operacionais;
- auditoria consolidada em `movimentacoes`.

## 7. Padrões adotados
- interface em PT-BR;
- separação lógica entre frontend e backend, com entrega do frontend estático pelo backend na execução da V1;
- responsividade com comportamento específico para desktop e mobile;
- impressão/exportação em páginas específicas;
- documentação OpenAPI centralizada em `docs/api/openapi.yaml`;
- PWA sem cache de dados da API nem uploads de pacientes.

