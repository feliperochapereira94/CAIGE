# Instalação e Execução

## 1. Pré-requisitos
Antes de iniciar, tenha instalado:
- **Node.js** (recomendado: versão LTS);
- **npm**;
- **MySQL**;
- navegador moderno (Chrome, Edge ou equivalente).

## 2. Estrutura esperada
Projeto com as pastas:
- `Backend/`
- `Frontend/`
- `docs/`

## 3. Configuração do banco de dados
### 3.1 Criar o banco
Crie um banco chamado `caige` no MySQL.

### 3.2 Importar a estrutura
Use o script base disponível em `Backend/database/`, preferencialmente:
- `CAIGE BANCO LIMPO.sql`

## 4. Configuração do backend
Entre na pasta do backend:
```bash
cd Backend
```

Instale as dependências:
```bash
npm install
```

Crie o `.env` a partir do arquivo de exemplo.

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Linux/macOS:
```bash
cp .env.example .env
```

Ajuste as variáveis conforme seu ambiente:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=caige
DB_PORT=3306
PORT=3000
NODE_ENV=development
JWT_SECRET=use_uma_chave_longa_aleatoria_e_exclusiva
JWT_EXPIRES_IN=8h
```

## 5. Executar o backend
### Modo normal
```bash
npm start
```

### Modo desenvolvimento
```bash
npm run dev
```

A aplicação ficará disponível em:
- `http://localhost:3000`

A documentação da API ficará em:
- `http://localhost:3000/api-docs`

## 6. Frontend
O frontend estático é servido pelo próprio backend. Não existe processo Node separado para o frontend e não é necessário iniciar servidor local adicional para `Frontend/`.

## 7. Porta utilizada
- **3000**: API e frontend do CAIGE.

## 8. Fluxo recomendado de uso local
1. subir MySQL;
2. executar o backend;
3. acessar `http://localhost:3000`.

## 9. Instalação como PWA
O CAIGE pode ser instalado como aplicativo pelo navegador em desktop e dispositivos móveis.

Requisitos:
- em `localhost`, o Service Worker funciona normalmente para desenvolvimento;
- fora do ambiente local, a aplicação precisa ser publicada por **HTTPS** para que o Service Worker e a instalação PWA funcionem;
- o manifest oficial é `Frontend/manifest.webmanifest`;
- o Service Worker oficial é `Frontend/service-worker.js`;
- os ícones oficiais da instalação ficam em `Frontend/recursos/images/pwa/`.

O Service Worker do CAIGE armazena somente recursos estáticos da interface. Respostas de `/api/` e arquivos de `/recursos/uploads/` não são colocados em cache para evitar persistência local de dados de pacientes.

Após alterar manifest, Service Worker ou ícones, feche e abra novamente o aplicativo instalado ou atualize o navegador para que a nova versão seja detectada.

## 10. Solução de problemas comuns
### Erro de conexão com banco
Verifique:
- se o MySQL está ativo;
- host, porta, usuário e senha do `.env`;
- se o banco `caige` existe.

### Porta 3000 ocupada
Altere a variável `PORT` no `.env`.

### Login não funciona
Verifique:
- se há dados de usuário no banco;
- se o JWT está configurado;
- se o backend iniciou sem erro.

### Swagger não abre
Verifique se o backend carregou corretamente `docs/api/openapi.yaml`.

## 11. Boas práticas
- manter `.env` fora de versionamento;
- não subir `node_modules` para Git ou pacotes finais;
- documentar migrations executadas;
- realizar backup antes de alterar estrutura de banco.
