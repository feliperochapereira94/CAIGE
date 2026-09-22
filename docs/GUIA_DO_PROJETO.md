# Guia do Projeto CAIGE

## 1. Visão geral
O **CAIGE** é uma aplicação web de apoio ao atendimento interdisciplinar, com recursos para gestão de pacientes, prontuário, controle de frequência, movimentações e administração.

## 2. Objetivo da V1
Disponibilizar uma versão estável e visualmente padronizada, acompanhada de documentação de usuário, documentação técnica e contrato de API coerentes com o comportamento real do sistema.

## 3. Perfis do sistema

### SUPERVISOR
Perfil com acesso administrativo ampliado. Pode administrar usuários, cursos, calendário de frequência, auditoria, arquivados e demais rotinas previstas para o perfil.

### PROFESSOR
Perfil operacional vinculado a um curso. Pode utilizar os módulos liberados para o perfil e gerenciar atividades do próprio curso, sem acesso ao Painel de Gerenciamento.

## 4. Módulos principais
- **Autenticação**
- **Painel**
- **Movimentações**
- **Pacientes**
- **Gestão de Prontuários**
- **Frequência**
- **Meu Curso** (Professor)
- **Painel de Gerenciamento** (Supervisor)
- **Auditoria** (Supervisor)
- **PWA** (instalação da interface em navegador compatível)

## 5. Estrutura geral
- `Frontend/`: interface web, manifest PWA, Service Worker e arquivos WebP de fotos de pacientes;
- `Backend/`: API, autenticação, regras de negócio e acesso a dados;
- `Backend/database/`: scripts SQL oficiais do schema e das massas de dados;
- `docs/`: documentação oficial da V1.

## 6. Tecnologias
Resumo:
- Frontend: HTML, CSS e JavaScript Vanilla;
- Backend: Node.js + Express;
- Banco: MySQL;
- Autenticação: JWT;
- API: OpenAPI + Swagger UI.

Detalhamento: [Tecnologias Utilizadas](tecnico/TECNOLOGIAS_UTILIZADAS.md).

## 7. Fluxo de alto nível
```text
Usuário → Frontend → API Backend → MySQL → Backend → Frontend
```

## 8. Documentos principais

### Para utilização
- [Manual Geral](usuario/MANUAL_USUARIO.md)
- [Manual do Professor](usuario/MANUAL_PROFESSOR.md)
- [Manual do Supervisor](usuario/MANUAL_SUPERVISOR.md)
- [Roteiro do Manual Ilustrado](usuario/ROTEIRO_MANUAL_ILUSTRADO.md)
- [Manual Ilustrado do Professor](manual%20ilustrado%20caige/Manual%20Ilustrado%20Professor%20-%20CAIGE.pdf)
- [Manual Ilustrado do Supervisor](manual%20ilustrado%20caige/Manual%20Ilustrado%20Supervisor%20-%20CAIGE.pdf)

### Para equipe técnica
- [Tecnologias Utilizadas](tecnico/TECNOLOGIAS_UTILIZADAS.md)
- [Arquitetura](tecnico/ARQUITETURA.md)
- [Instalação e Execução](tecnico/INSTALACAO_EXECUCAO.md)
- [Banco de Dados](tecnico/BANCO_DE_DADOS.md)
- [Regras de Negócio](tecnico/REGRAS_DE_NEGOCIO.md)
- [Segurança e Permissões](tecnico/SEGURANCA_PERMISSOES.md)
- [Guia Técnico em PDF](tecnico/GUIA_TECNICO_CAIGE.pdf)
- [Design System em PDF](tecnico/DESIGN_SYSTEM_CAIGE.pdf)
- [Regras de Desenvolvimento em PDF](tecnico/REGRAS_DESENVOLVIMENTO_CAIGE.pdf)

### Para integração
- [Visão geral da API](api/README_API.md)
- [Contrato OpenAPI](api/openapi.yaml)

## 9. Foto do paciente e arquivos locais
A foto do paciente é opcional. O frontend recorta/otimiza a imagem para WebP e o backend grava o arquivo em `Frontend/recursos/uploads/pacientes/<id>.webp`. O schema MySQL não armazena BLOB nem caminho persistente de foto; a API identifica a existência do arquivo pelo ID do paciente. Na ausência de foto, a interface usa as iniciais do nome como fallback.

O Service Worker exclui `/recursos/uploads/` e `/api/` do cache.

## 10. Convenções
- interface e documentação em **PT-BR**;
- nomes técnicos preservados quando fazem parte de contratos, bibliotecas, APIs ou semântica da linguagem;
- navegação autenticada centralizada no **Shell Global**;
- autorização real validada no backend;
- auditoria consolidada em `movimentacoes`;
- calendário de frequência administrado pelo Supervisor.

## 11. Documentação oficial
A pasta `docs/` contém a documentação oficial e vigente da V1 do CAIGE. Os documentos devem permanecer alinhados ao comportamento atual do sistema e ser atualizados sempre que uma alteração futura modificar regras, contratos ou fluxos documentados.

## 12. Status
**V1 consolidada no pacote revisado de 22/09/2026. Frontend, backend, banco de dados, PWA, revisão geral, documentação técnica e manuais por perfil estão presentes e devem permanecer sincronizados no mesmo ciclo de qualquer alteração futura.**
