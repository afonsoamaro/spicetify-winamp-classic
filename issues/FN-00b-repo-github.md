# [FN-00b] Repositório git e GitHub

## Type
Functional (infra, fazer cedo)

## Description
Versionar o projeto e publicá-lo no GitHub como repositório público, porque o Marketplace do Spicetify só instala de repo público com o tópico `spicetify-themes`. Isso puxa as obrigações de abrir repo da pasta: gitleaks limpo, licença e README.

## Requirements
- Branch dedicada para cada issue, merge `--no-ff` na `main` com subject só.
- `LICENSE` MIT em nome do dono do repo.
- `README.md` inicial: o que é, status "em construção", como instalar manualmente, como contribuir. O README final com preview fica na FN-06.
- `.github/workflows/ci.yml` copiado do molde do `omni-status`, sem o passo `dir:validate`, rodando `pnpm check` (lint, typecheck, test, build) em `pull_request` e em `push` para `main`.
- `.github/dependabot.yml` com ecossistemas `npm` e `github-actions`, semanal.
- `gitleaks git . -v` e `gitleaks dir . -v` limpos antes do primeiro push.
- Repo público `afonsoamaro/spicetify-winamp-classic` via `gh repo create`, com o tópico `spicetify-themes` e descrição.
- Issues de `issues/` publicadas como GitHub Issues, uma por arquivo, com labels `prototype` e `functional`. `_index.md` vira issue de tracking.

## Security
- Não há `.env` nem segredo neste projeto. O gitleaks é a única checagem e precisa rodar no histórico inteiro.

## Acceptance Criteria
- [ ] `LICENSE`, `README.md`, `ci.yml` e `dependabot.yml` na `main`.
- [ ] gitleaks limpo no histórico e no working tree.
- [ ] Repo público criado com tópico `spicetify-themes`, push feito, CI verde no primeiro run.
- [ ] Issues publicadas com labels e tracking issue aberta.

## Dependencies
- FN-00

## Notes
- Toda escrita em git e GitHub (`commit`, `push`, `gh repo create`, criar issues) exige confirmação na hora. Esta issue descreve o trabalho, a execução pede o OK do usuário.
- Nenhum trailer de atribuição de IA em commit, PR ou issue.
