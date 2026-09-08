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

---

# Implementation Plan

Pesquisa feita em 2026-09-08. Tags das actions consultadas via `gh api releases/latest`, gitleaks 8.30.1 e gh 2.100.0 já instalados e autenticados na conta `afonsoamaro` com escopos `repo` e `workflow`.

## Prerequisites
- FN-00 done e mergeada na `main` (feito em 2026-09-08, commit `f869c06`).
- `gitleaks git . -v` e `gitleaks dir . -v` já rodados na `main` atual: 4 commits, nenhum vazamento. Repetir antes do push.

## Reusable Code Found
- `~/code/afonsoamaro/omni-status/LICENSE`: texto MIT com `Copyright (c) 2026 Afonso Amaro`. Copiar igual.
- `~/code/afonsoamaro/omni-status/.github/workflows/ci.yml`: molde do CI. Manter a forma (checkout, pnpm, setup-node com `node-version-file` e cache pnpm, install com lockfile congelado, `pnpm check`). Remover o passo `dir:validate`, que é específico daquele app.
- `~/code/afonsoamaro/omni-status/.github/dependabot.yml`: copiar igual, ecossistemas `npm` e `github-actions`, semanal, limite de 5 PRs.
- `~/code/afonsoamaro/omni-status/README.md`: estrutura de referência. Seções que valem aqui: título e uma frase, Status, Getting started, Quality gate, License. As seções de arquitetura, portas e telemetria não se aplicam.
- Labels do `omni-status` no GitHub: `setup` fbca04 "Infra/scaffold, do first", `prototype` c5def5 "Prototype issue (PP)", `functional` 0e8a16 "Functional issue (FN)". Recriar com os mesmos nomes e cores.
- Padrão de título das issues no `omni-status`: o `#` da primeira linha do arquivo, tipo `[FN-00] Setup base ...`. Corpo é o markdown inteiro do arquivo.

## Architecture Decisions
- **`actions/checkout@v7`** (v7.0.1, consultada na hora), por major porque a action é do próprio GitHub.
- **`pnpm/setup` fixado por SHA, como o molde.** Na execução (2026-09-08) o `omni-status` já tinha migrado de `pnpm/action-setup` para `pnpm/setup` v2.1.0, porque a `action-setup` roda em Node 20, descontinuado no Actions em 2026-06-02. Este repo acompanha: sem `setup-node`, sem passo de install separado, `cache: true` e `require-lockfile: true`. O Node do CI vem de `devEngines.runtime` no `package.json`, que entra nesta issue.
- **SHA conferido na API do GitHub, não copiado do molde.** O SHA que o `omni-status` fixou (`c8e77b7`) não é encontrado pela API de commits do `pnpm/setup`, embora o CI de lá esteja verde com ele: deve ser um objeto não alcançável por nenhuma ref, e não o commit da tag v2.1.0 que o comentário promete. A tag `v2.1.0` é anotada e aponta para `703c526` (2026-08-28), que é o SHA usado aqui.
- **Repo público desde a criação**, com `gh repo create --public --source=. --remote=origin --push`. O Marketplace só lista repo público com tópico `spicetify-themes`.
- **Tracking do `_index.md`**: uma issue fixada `[INDEX] Issues index` com a tabela do `_index.md` no corpo e links para as issues criadas. O `omni-status` não fez milestone nem tracking, então não há molde; issue fixada é o mais simples de manter.
- **Sem script versionado para publicar issues.** É um loop de `gh issue create` na execução. Só vira script se aparecer uma segunda leva de issues.
- **Branches preservadas no remoto**: push de `main` e das três branches de trabalho, seguindo a regra de merge `--no-ff` com branch remota preservada.
- **README em inglês**, como o resto dos artefatos públicos deste repo.

## Files to Create
| File | Purpose |
|------|---------|
| `LICENSE` | MIT, cópia do `omni-status` |
| `README.md` | inicial, em inglês, para quem chega frio |
| `.github/workflows/ci.yml` | molde do `omni-status` com majors atuais e sem `dir:validate` |
| `.github/dependabot.yml` | cópia do `omni-status` |

## Files to Modify (adicionado na execução)
| File | Changes |
|------|---------|
| `package.json` | bloco `devEngines.runtime` node `^24` com `onFail: error`, lido pelo `pnpm/setup` no CI |

### README.md
- Título `# Winamp Classic for Spicetify` e uma frase: recria o visual do Winamp 2.x no Spotify, com CSS, uma fonte pixel e uma extensão pequena para espectro, marquee e barra de título.
- `## Status`: em construção. Paleta e tooling prontos, CSS e extensão em andamento. Link para `issues/_index.md`.
- `## Install`: por enquanto só manual: clone, symlink em `~/.config/spicetify/Themes/WinampClassic`, `spicetify config current_theme WinampClassic color_scheme Classic`, `spicetify apply`. Uma linha dizendo que a instalação pelo Marketplace chega quando o tema for publicado.
- `## Development`: `nvm use`, `pnpm install`, `pnpm check`, `pnpm build`, `spicetify watch -s`. Explicar que `theme.js` é gerado de `src/` por `scripts/build.js` e é versionado.
- `## Quality gate`: `pnpm check` roda lint, typecheck, test e build, e o CI roda o mesmo comando.
- `## Contributing`: issues em `issues/`, branch por issue, `pnpm check` verde antes do PR.
- `## Credits and license`: MIT. Nenhum asset do Winamp original é usado; o visual é recriado com CSS. Fonte Silkscreen sob SIL OFL (entra na PP-01, citar já).
- Uma linha por parágrafo. Sem travessão.

### .github/workflows/ci.yml
- `name: CI`, `on: pull_request` e `push` em `main`.
- Passos: `actions/checkout@v7`, `pnpm/setup@<sha> # v2.1.0` com `cache: true` e `require-lockfile: true`, `pnpm check`.

## Files to Modify
| File | Changes |
|------|---------|
| `issues/_index.md` | status da FN-00b para `done` só depois do verify-it; sem outra mudança |

## Data Requirements
- Nenhum.

## Testing Strategy
- `pnpm check` local antes do commit (README e YAML não passam por lint, mas o gate precisa continuar verde).
- `gitleaks git . -v` e `gitleaks dir . -v` limpos imediatamente antes do push.
- CI: `gh run watch` no primeiro run da `main`, verde.
- Issues: `gh issue list --json number,title,labels` com 13 issues mais a de índice, cada uma com label certa.

## Implementation Order
1. `git switch -c chore/fn-00b-repo-github main`.
2. Criar `LICENSE`, `README.md`, `.github/workflows/ci.yml`, `.github/dependabot.yml`. Rodar `pnpm check`.
3. Confirmação: commit `chore: add license, README, CI and dependabot`.
4. Confirmação: merge `--no-ff` na `main`.
5. `gitleaks git . -v` e `gitleaks dir . -v`.
6. Confirmação: `gh repo create afonsoamaro/spicetify-winamp-classic --public --source=. --remote=origin --description "The classic Winamp 2.x look for Spotify, as a Spicetify theme" --push`, depois `git push -u origin chore/fn-00-spec feat/fn-00-setup-base chore/fn-00b-repo-github`.
7. `gh repo edit --add-topic spicetify-themes --add-topic spicetify --add-topic winamp`.
8. Confirmação: labels `setup`, `prototype`, `functional`; uma issue por arquivo de `issues/` (exceto `_index.md` e `metrics/`), título da primeira linha, corpo do arquivo, label pelo prefixo (`FN-00*` setup, `PP-` prototype, `FN-` functional); issue `[INDEX] Issues index` com a tabela e fixada com `gh issue pin`.
9. Fechar a issue da FN-00 com comentário apontando o merge `f869c06` e o score do verify-it.
10. `gh run watch` até o CI da `main` ficar verde.

## Security Considerations
- Nenhum segredo no repo. O gitleaks é o único check e roda no histórico inteiro antes do push.
- O token do `gh` tem escopo `workflow`, necessário para subir `.github/workflows/ci.yml`. Sem ele o push é rejeitado.
- Público desde o início: tudo que entrar na `main` a partir daqui é visível. Issues e specs incluem custos de sessão em `issues/metrics/`, que é informação do próprio dono e fica.
