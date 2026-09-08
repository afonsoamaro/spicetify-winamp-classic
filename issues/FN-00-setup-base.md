# [FN-00] Setup base e quádrupla de qualidade

## Type
Functional (infra, fazer primeiro)

## Description
Deixar o repositório vazio com a quádrupla verde (lint, typecheck, teste, build) e o tema carregando no Spotify local antes de qualquer CSS ou JS de verdade.

## Requirements
- `package.json` com `packageManager` pnpm fixado, `.nvmrc` na LTS atual do Node e scripts `lint`, `typecheck`, `test`, `build` e `check` (`check` roda os quatro).
- eslint com config flat para `theme.js`, `src/`, `scripts/` e `test/`.
- stylelint no `user.css` com regra que proíbe `border-radius` diferente de 0.
- `tsconfig.json` com `allowJs`, `checkJs`, `noEmit`, incluindo `types/globals.d.ts` copiado de `~/.spicetify/globals.d.ts`.
- vitest com ao menos um teste real em `test/` cobrindo o script de build.
- `scripts/build.js` gerando um `theme.js` mínimo a partir de `src/` (só o esqueleto, a lógica vem nas FN seguintes).
- `color.ini` com a seção `[Classic]` e os 18 campos do `color.ini` padrão do Spicetify, com os valores da spec.
- `user.css` só com o bloco `:root` das variáveis `--wa-*` e um comentário por área futura.
- `manifest.json` com os campos obrigatórios do Marketplace e `include` apontando para o jsdelivr do `theme.js` em `main`.
- Symlink do repo em `~/.config/spicetify/Themes/WinampClassic`, `spicetify config current_theme WinampClassic color_scheme Classic` e `spicetify apply` com o Spotify abrindo na paleta nova.
- `.gitignore` com `node_modules`.

## Acceptance Criteria
- [ ] Toda dependência chave fixada na versão estável mais recente consultada no registry na hora (`npm view <pkg> version`), nunca de cabeça: Node, pnpm, eslint, stylelint, typescript, vitest. Ficar numa linha anterior exige motivo anotado nesta issue.
- [ ] `pnpm check` verde com 0 erros de lint, 0 erros de tipo, o teste do build passando e o build gerando `theme.js`.
- [ ] `pnpm build` gera `theme.js` sem erro.
- [ ] Spotify abre com o tema `WinampClassic` aplicado e as cores do `color.ini` visíveis.
- [ ] `spicetify watch -s` recarrega ao salvar `user.css` e `theme.js`.

## Dependencies
- nenhuma

---

# Implementation Plan

Pesquisa feita em 2026-09-07. Versões consultadas no registry na hora, e o `tsc` 7 sondado num diretório temporário com `checkJs` e o `globals.d.ts` do Spicetify.

## Prerequisites
- Node 24 ativo via nvm (local está em 24.19.0, LTS atual é 24.20.0; `.nvmrc` fixa a major `24` como no `omni-status`).
- corepack ativo para respeitar o `packageManager`.
- Spotify fechado na hora do `spicetify apply`, porque o comando reinicia o client.

## Reusable Code Found
- `~/code/afonsoamaro/omni-status/.gitignore`: base do `.gitignore`, sem as entradas de Next e `.env`.
- `~/code/afonsoamaro/omni-status/eslint.config.mjs`: molde do flat config. Aqui sem `typescript-eslint` e sem prettier, porque o código é JS puro checado pelo `tsc`.
- `~/code/afonsoamaro/omni-status/vitest.config.ts` e `tsconfig.base.json`: referência de opções, adaptadas para `allowJs` e `checkJs`.
- `~/.spicetify/globals.d.ts` (2409 linhas): tipos do Spicetify, copiado para `types/globals.d.ts`. Referencia o namespace `React`, então `@types/react` entra como devDependency só para tipos.
- `~/.spicetify/Themes/SpicetifyDefault/color.ini`: lista canônica dos 18 campos e a descrição de cada um, usada como comentário no nosso `color.ini`.
- `~/.config/spicetify/config-xpui.ini`: já tem `inject_theme_js 1`, `inject_css 1`, `replace_colors 1`. Só `current_theme` e `color_scheme` mudam.

## Architecture Decisions
- JS puro com `// @ts-check` e JSDoc em vez de TypeScript compilado. Motivo: o Spicetify carrega um único `theme.js` sem bundler, e `tsc --noEmit` com `checkJs` dá o mesmo gate de tipos sem etapa de transpilação. Sondado com TypeScript 7.0.2: pega erro de tipo em JS e fica limpo com `@types/react` instalado.
- Sem prettier neste projeto. O `user.css` é formatado pelo stylelint e o JS é pequeno. Evita um terceiro formatador brigando com o stylelint.
- Versões fixadas (registry em 2026-09-07): pnpm 12.3.4, eslint 10.10.0, @eslint/js 10.0.1, globals 17.12.0, stylelint 17.15.0, stylelint-config-standard 40.0.0 (peer stylelint ^17), typescript 7.0.2, vitest 5.0.0 (engine node ^24 ok), @types/react 19.2.18. Sem `jiti` porque o config do eslint é `.mjs`, não `.ts`.
- `include` do `manifest.json` aponta para jsdelivr, não raw do GitHub: o raw serve `text/plain` com `nosniff` e o navegador recusa como script. O Comfy usa GitHub Pages pelo mesmo motivo.
- Flag do watch é `-s` (tema ativo: `color.ini`, `user.css`, `theme.js`), não `-le`. Corrigido na spec.
- Cor de hover: a spec original não tinha `main-elevated`, `highlight` e `highlight-elevated`. Entram com #1a1a22, #0000c6 e #0000c6.

## Files to Create
| File | Purpose |
|------|---------|
| `.nvmrc` | `24` |
| `package.json` | `name` `spicetify-winamp-classic`, `private: true`, `type: module`, `packageManager: pnpm@12.3.4`, `engines.node >=24`, scripts e devDependencies acima |
| `.gitignore` | `node_modules/`, `coverage/`, `.DS_Store`, `*.log` |
| `eslint.config.mjs` | flat config: `js.configs.recommended`, `globals.browser` para `src/`, `globals.node` para `scripts/` e `test/`, global `Spicetify: 'readonly'`, `ignores: ['theme.js']` porque é artefato gerado |
| `.stylelintrc.json` | `extends: stylelint-config-standard`, `rules`: `declaration-property-value-disallowed-list` com `border-radius` proibindo qualquer valor que não comece com `0`; `color-no-hex: true` e `color-named: never` para forçar `var()`; o bloco `:root` usa `/* stylelint-disable color-no-hex */` |
| `tsconfig.json` | `allowJs`, `checkJs`, `noEmit`, `strict`, `target ES2023`, `module ESNext`, `moduleResolution bundler`, `lib ["ES2023","DOM"]`, `types ["react"]`, `include ["src/**/*.js","scripts/**/*.js","test/**/*.js","types/**/*.d.ts"]` |
| `vitest.config.js` | `test.include ['test/**/*.test.js']` |
| `types/globals.d.ts` | cópia de `~/.spicetify/globals.d.ts`, com comentário de origem e versão 2.44.0 na primeira linha |
| `src/index.js` | entrada de DOM mínima: `// @ts-check`, função `main()` que loga `[winamp-classic] loaded` e o esqueleto de `waitForSpicetify` fica para a FN-01 |
| `scripts/build.js` | lê `src/*.js` numa ordem fixa declarada num array no topo (`index.js` por último), remove linhas `import`/`export` com regex de início de linha, embrulha em `(function () { 'use strict'; ... })();` e escreve `theme.js` com cabeçalho `// generated by scripts/build.js, do not edit` |
| `test/build.test.js` | teste que importa `build` de `scripts/build.js` e valida a saída. Já cobre o build e é reaproveitado na FN-01 |
| `color.ini` | `[Classic]` com os 18 campos, valores da spec, comentário de cabeçalho copiado do padrão |
| `user.css` | cabeçalho, bloco `:root` com as variáveis `--wa-*`, e um comentário por área: fonte, barra de reprodução, lista de faixas, sidebar, top bar, scrollbars, cards e controles |
| `manifest.json` | campos obrigatórios e `include` jsdelivr |
| `theme.js` | artefato gerado pelo `pnpm build`, versionado |
| `pnpm-lock.yaml` | lockfile |
| `pnpm-workspace.yaml` | criado pelo pnpm 12: exceção de idade mínima de publicação para `@types/node` 26.5.0, publicado no mesmo dia. O critério de versão mais recente pesa mais que a quarentena aqui, porque o pacote é só de tipos e roda em dev |

Entregue além da tabela original, todos necessários: `@types/node` (o `scripts/build.js` usa `node:fs` e não tipa sem ele), `types: ["node","react"]`, `noUncheckedIndexedAccess` e `skipLibCheck` no tsconfig, e `vitest.config.js` no `include`.

### scripts/build.js
- Ordem: `['time.js','marquee.js','spectrum.js','dom.js','index.js']`, ignorando os que ainda não existem, para o script já servir às FN seguintes.
- Exportar `build({ srcDir, outFile })` como função e só executar quando for o módulo principal (`import.meta.url === pathToFileURL(process.argv[1]).href`), para o teste importar sem efeito colateral.

### package.json scripts
- `lint`: `eslint . && stylelint "**/*.css"`
- `typecheck`: `tsc --noEmit`
- `test`: `vitest run`
- `build`: `node scripts/build.js`
- `check`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Files to Modify
| File | Changes |
|------|---------|
| `~/.config/spicetify/config-xpui.ini` | via CLI: `spicetify config current_theme WinampClassic color_scheme Classic` |

## Data Requirements
- Nenhum.

## Testing Strategy
- `test/build.test.js`: chama `build` com um `srcDir` temporário contendo dois módulos com `export`, confere que a saída tem a IIFE, não tem `export` nem `import`, e respeita a ordem.
- Verificação manual no Spotify: após `spicetify apply`, o fundo do conteúdo fica preto e o texto verde. Console do Spotify (`spicetify enable-devtools`, Cmd+Option+I) mostra `[winamp-classic] loaded`.

## Implementation Order
1. `nvm use 24`, `corepack enable`, `.nvmrc`, `package.json`, `pnpm install`.
2. Configs de eslint, stylelint, tsconfig, vitest e `types/globals.d.ts`. Rodar `pnpm lint` e `pnpm typecheck` no vazio.
3. `scripts/build.js`, `src/index.js`, `test/build.test.js`, `pnpm test`, `pnpm build`.
4. `color.ini`, `user.css`, `manifest.json`.
5. Symlink em `~/.config/spicetify/Themes/WinampClassic`, `spicetify config`, `spicetify apply`, conferir no Spotify.
6. `pnpm check` completo e reportar os quatro status com contagem.

## Unknowns
- Symlink na pasta `Themes`: não confirmado que o Spicetify segue symlink de diretório. Se `spicetify apply` reclamar do tema, o fallback é copiar os arquivos com um script `pnpm sync` que faz `rsync` do repo para a pasta, e o watch passa a rodar sobre a cópia.
- `spicetify apply` reinicia o Spotify. Executar com o usuário ciente.

## Security Considerations
- Nenhuma. Não há segredo, rede nem dado de usuário nesta issue.
