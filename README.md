# CAIGE — Sistema de Gestão de Pacientes, Frequência e Prontuários


> **Padrão de listagens:** no desktop, registros repetitivos devem reutilizar `data-table`/`data-grid` globais; no mobile podem se reorganizar em cards responsivos. Não criar grid, menu `⋮`, paginação ou aparência paralela quando houver componente global.

## Sobre o projeto
O **CAIGE** é uma aplicação web voltada ao apoio do atendimento interdisciplinar, com foco no cadastro de pacientes, controle de frequência, prontuário, atividades por curso, auditoria e administração de usuários.

Esta versão corresponde à **V1 consolidada no pacote revisado de 22/09/2026**. Frontend, backend, banco de dados, PWA, revisão geral, documentação técnica e manuais por perfil estão presentes no pacote vigente. Os arquivos Markdown continuam como fontes editáveis; os PDFs técnicos e os manuais ilustrados são versões de consulta/apresentação derivadas dessas fontes e da interface aprovada.

## Principais módulos
- **Autenticação**
- **Painel**
- **Movimentações**
- **Pacientes**
- **Gestão de Prontuários**
- **Frequência**
- **Painel de Gerenciamento**
- **Auditoria**

## Perfis de acesso
- **SUPERVISOR**: acesso administrativo ampliado.
- **PROFESSOR**: acesso operacional com restrição ao curso vinculado.

## Tecnologias principais
### Frontend
- HTML5
- CSS3
- JavaScript Vanilla
- Flatpickr (datas)
- jsPDF + jsPDF AutoTable (PDF)
- ExcelJS (Excel)
- Web App Manifest + Service Worker (PWA)
- Canvas API para recorte/otimização de foto de paciente em WebP

### Backend
- Node.js
- Express
- MySQL2
- JWT (`jsonwebtoken`)
- Bcrypt (`bcryptjs`)
- Dotenv
- Swagger UI Express
- YAML

### Banco de dados
- MySQL
- Scripts SQL oficiais em `Backend/database/`

## Estrutura do projeto
```text
CAIGE/
├── Backend/
│   ├── database/
│   ├── src/
│   ├── .env.example
├── Frontend/
│   ├── paginas/
│   ├── recursos/css/
│   ├── recursos/js/
│   ├── recursos/images/
│   ├── recursos/uploads/pacientes/
│   ├── manifest.webmanifest
│   ├── service-worker.js
├── docs/
│   ├── usuario/
│   ├── tecnico/
│   ├── api/
│   ├── manual ilustrado caige/
├── DESIGN_SYSTEM.md
├── REGRAS_PROJETO.md
├── PROMPT_IA.md
```

## Execução rápida
### 1) Banco de dados
- Criar o banco `caige` no MySQL.
- Importar o script base disponível em `Backend/database/`.

### 2) Backend
```bash
cd Backend
npm install
cp .env.example .env
```
Ajuste o `.env` com os dados reais do MySQL.

Depois:
```bash
npm start
```
Servidor padrão: `http://localhost:3000`

### 3) Frontend
O frontend estático é servido automaticamente pelo backend. Não há processo Node separado para o frontend.

## Documentação
- **Índice geral**: [docs/README.md](docs/README.md)
- **Guia do projeto**: [docs/GUIA_DO_PROJETO.md](docs/GUIA_DO_PROJETO.md)
- **Tecnologias utilizadas**: [docs/tecnico/TECNOLOGIAS_UTILIZADAS.md](docs/tecnico/TECNOLOGIAS_UTILIZADAS.md)
- **Arquitetura**: [docs/tecnico/ARQUITETURA.md](docs/tecnico/ARQUITETURA.md)
- **Instalação e execução**: [docs/tecnico/INSTALACAO_EXECUCAO.md](docs/tecnico/INSTALACAO_EXECUCAO.md)
- **Banco de dados**: [docs/tecnico/BANCO_DE_DADOS.md](docs/tecnico/BANCO_DE_DADOS.md)
- **Regras de negócio**: [docs/tecnico/REGRAS_DE_NEGOCIO.md](docs/tecnico/REGRAS_DE_NEGOCIO.md)
- **Segurança e permissões**: [docs/tecnico/SEGURANCA_PERMISSOES.md](docs/tecnico/SEGURANCA_PERMISSOES.md)
- **Guia Técnico em PDF**: [docs/tecnico/GUIA_TECNICO_CAIGE.pdf](docs/tecnico/GUIA_TECNICO_CAIGE.pdf)
- **Design System em PDF**: [docs/tecnico/DESIGN_SYSTEM_CAIGE.pdf](docs/tecnico/DESIGN_SYSTEM_CAIGE.pdf)
- **Regras de Desenvolvimento em PDF**: [docs/tecnico/REGRAS_DESENVOLVIMENTO_CAIGE.pdf](docs/tecnico/REGRAS_DESENVOLVIMENTO_CAIGE.pdf)
- **Manual do usuário**: [docs/usuario/MANUAL_USUARIO.md](docs/usuario/MANUAL_USUARIO.md)
- **Manual Ilustrado do Professor**: [docs/manual ilustrado caige/Manual Ilustrado Professor - CAIGE.pdf](docs/manual%20ilustrado%20caige/Manual%20Ilustrado%20Professor%20-%20CAIGE.pdf)
- **Manual Ilustrado do Supervisor**: [docs/manual ilustrado caige/Manual Ilustrado Supervisor - CAIGE.pdf](docs/manual%20ilustrado%20caige/Manual%20Ilustrado%20Supervisor%20-%20CAIGE.pdf)
- **API**: [docs/api/README_API.md](docs/api/README_API.md) e [docs/api/openapi.yaml](docs/api/openapi.yaml)

## Observações importantes
- Não versionar `.env` com dados reais.
- Não incluir `node_modules` nos pacotes finais.
- Para documentação de API, usar também `http://localhost:3000/api-docs`.
- Esta V1 já contempla as limpezas de legado aprovadas no backend e no frontend.
- Fotos de pacientes são arquivos WebP em `Frontend/recursos/uploads/pacientes/`; não são armazenadas como BLOB ou caminho persistente no schema MySQL.
- O Service Worker nunca coloca `/api/` nem `/recursos/uploads/` em cache.
