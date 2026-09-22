# Tecnologias Utilizadas

## 1. Visão geral
Este documento reúne as tecnologias, bibliotecas e ferramentas utilizadas na V1 do CAIGE.

## 2. Frontend
### Linguagens base
- **HTML5**
- **CSS3**
- **JavaScript Vanilla**

### Estrutura do frontend
- Interface organizada em páginas estáticas dentro de `Frontend/paginas/`;
- Estilos globais organizados em `Frontend/recursos/css/base.css`, `Frontend/recursos/css/componentes.css`, `Frontend/recursos/css/layout.css`, `Frontend/recursos/css/responsive.css` e CSSs por página;
- Scripts utilitários e de negócio em `Frontend/recursos/js/`.

### Bibliotecas externas usadas no frontend
#### IBM Plex Sans (Google Fonts)
Fonte tipográfica oficial da interface, carregada de forma centralizada por `Frontend/recursos/css/base.css` nos pesos 400, 500, 600 e 700. O sistema mantém fallback para `Segoe UI`, Arial, Helvetica e sans-serif quando a fonte externa não estiver disponível.

#### Flatpickr
Usado para campos de data.
- Arquivos/pontos de uso: páginas de cadastro/edição de pacientes;
- Localização PT-BR aplicada via `Frontend/recursos/js/date-picker-ptbr.js`.

#### jsPDF
Usado para exportação/geração de PDF no frontend.

#### jsPDF AutoTable
Usado para tabelas em documentos PDF.

#### ExcelJS
Usado para exportação em Excel.

#### Web App Manifest + Service Worker
Usados para instalação do CAIGE como PWA e cache controlado de recursos estáticos. O Service Worker não armazena respostas de `/api/` nem arquivos em `/recursos/uploads/`.

#### Canvas API + WebP
O editor de foto do paciente usa Canvas no navegador para recorte quadrado e conversão para `image/webp` antes do envio ao backend. Não há biblioteca de processamento de imagem no backend.


## 3. Backend
### Runtime e framework
- **Node.js**
- **Express**

### Bibliotecas do backend
#### dotenv
Carregamento de variáveis de ambiente.

#### mysql2
Conexão com o banco MySQL.

#### jsonwebtoken
Autenticação baseada em JWT.

#### bcryptjs
Hash e verificação de senhas.

#### swagger-ui-express
Publicação da documentação interativa da API.

#### yaml
Leitura do arquivo OpenAPI em YAML.

## 4. Banco de dados
- **MySQL**
- Scripts SQL em `Backend/database/`
- Estrutura de dados vigente da V1 mantida pelos scripts SQL em `Backend/database/`.

## 5. Documentação e API
### OpenAPI 3
A especificação da API fica em:
- `docs/api/openapi.yaml`

### Swagger UI
Disponível em:
- `http://localhost:3000/api-docs`

## 6. Ferramentas e práticas adotadas
- Organização por módulos;
- Shell Global para navegação autenticada;
- Controle de acesso por perfil e permissões;
- Exportação de relatórios em PDF e Excel;
- Auditoria em `movimentacoes`;
- Documentação em PT-BR com preservação de semântica técnica.

## 7. Resumo rápido
| Camada | Tecnologias |
|---|---|
| Frontend | HTML5, CSS3, JavaScript Vanilla, IBM Plex Sans, Flatpickr, jsPDF, jsPDF AutoTable, ExcelJS, Web App Manifest, Service Worker, Canvas/WebP |
| Backend | Node.js, Express, dotenv, mysql2, jsonwebtoken, bcryptjs, swagger-ui-express, yaml |
| Banco | MySQL |
| API/Docs | OpenAPI 3, Swagger UI |
