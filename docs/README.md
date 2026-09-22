# Documentação do CAIGE

Este diretório reúne a documentação oficial da V1 do CAIGE. Este arquivo funciona como **índice central**, evitando duplicar o conteúdo do README da raiz e indicando a fonte adequada para cada assunto.

## Status
A documentação técnica da V1 está **consolidada e alinhada ao pacote revisado de 22/09/2026, ao banco e ao contrato OpenAPI vigente**. O PWA e os manuais por perfil já fazem parte do pacote atual. Os documentos Markdown permanecem como fontes editáveis e os PDFs técnicos funcionam como versões visuais de consulta.

## Comece por aqui
1. [README da raiz](../README.md) — visão geral, tecnologias principais e execução rápida;
2. [Guia do Projeto](GUIA_DO_PROJETO.md) — escopo funcional, perfis, módulos e convenções;
3. [Instalação e Execução](tecnico/INSTALACAO_EXECUCAO.md) — preparação do ambiente local;
4. [Arquitetura](tecnico/ARQUITETURA.md) — organização das camadas e responsabilidades;
5. [Regras de Negócio](tecnico/REGRAS_DE_NEGOCIO.md) — comportamento funcional consolidado.

## Documentação técnica
- [Arquitetura](tecnico/ARQUITETURA.md)
- [Instalação e Execução](tecnico/INSTALACAO_EXECUCAO.md)
- [Tecnologias Utilizadas](tecnico/TECNOLOGIAS_UTILIZADAS.md)
- [Banco de Dados](tecnico/BANCO_DE_DADOS.md)
- [Regras de Negócio](tecnico/REGRAS_DE_NEGOCIO.md)
- [Segurança e Permissões](tecnico/SEGURANCA_PERMISSOES.md)

### PDFs técnicos
- [Guia Técnico do Projeto CAIGE](tecnico/GUIA_TECNICO_CAIGE.pdf)
- [Design System CAIGE](tecnico/DESIGN_SYSTEM_CAIGE.pdf)
- [Regras de Desenvolvimento CAIGE](tecnico/REGRAS_DESENVOLVIMENTO_CAIGE.pdf)

## API
- [Visão geral da API](api/README_API.md)
- [Contrato OpenAPI](api/openapi.yaml)
- Swagger UI em execução local: `http://localhost:3000/api-docs`

## Manuais de usuário
- [Manual Geral](usuario/MANUAL_USUARIO.md)
- [Manual do Professor](usuario/MANUAL_PROFESSOR.md)
- [Manual do Supervisor](usuario/MANUAL_SUPERVISOR.md)
- [Roteiro do Manual Ilustrado](usuario/ROTEIRO_MANUAL_ILUSTRADO.md)

### Manuais ilustrados existentes
- [Manual Ilustrado do Professor](manual%20ilustrado%20caige/Manual%20Ilustrado%20Professor%20-%20CAIGE.pdf)
- [Manual Ilustrado do Supervisor](manual%20ilustrado%20caige/Manual%20Ilustrado%20Supervisor%20-%20CAIGE.pdf)

Os manuais ilustrados correspondem às versões de consulta visual por perfil presentes no pacote atual e devem ser regenerados sempre que uma alteração de interface tornar seus prints ou instruções obsoletos.

## Fontes de verdade do projeto
Na raiz do projeto:
- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) — padrão visual oficial;
- [REGRAS_PROJETO.md](../REGRAS_PROJETO.md) — regras de manutenção e implementação;
- [PROMPT_IA.md](../PROMPT_IA.md) — contexto técnico para assistentes de desenvolvimento.

## Hierarquia de referência
Quando houver dúvida entre documentos:
1. comportamento executável do código e schema vigente;
2. contrato [OpenAPI](api/openapi.yaml) para a interface HTTP;
3. regras de negócio e segurança;
4. design system e regras do projeto para padrões de interface/manutenção;
5. manuais de usuário para orientação operacional.

Uma divergência encontrada entre essas fontes deve ser corrigida no mesmo ciclo da alteração; não deve ser mantida como exceção documental.

## Regra de atualização
Quando uma alteração modificar comportamento, contrato, estrutura, permissão ou padrão visual documentado, o documento correspondente deve ser atualizado no mesmo ciclo da mudança.
