# [FN-00] Setup base e tríade de qualidade

## Type
Functional (infra, fazer primeiro)

## Description
Deixar o repositório vazio com a tríade verde (lint, typecheck, teste) e o tema carregando no Spotify local antes de qualquer CSS ou JS de verdade.

## Requirements
- `package.json` com `packageManager` pnpm fixado, `.nvmrc` na LTS atual do Node e scripts `lint`, `typecheck`, `test`, `build` e `check` (`check` roda os três primeiros).
- eslint com config flat para `theme.js`, `src/`, `scripts/` e `test/`.
- stylelint no `user.css` com regra que proíbe `border-radius` diferente de 0.
- `tsconfig.json` com `allowJs`, `checkJs`, `noEmit`, incluindo `types/globals.d.ts` copiado de `~/.spicetify/globals.d.ts`.
- vitest com um teste placeholder em `test/` que passa.
- `scripts/build.js` gerando um `theme.js` mínimo a partir de `src/` (só o esqueleto, a lógica vem nas FN seguintes).
- `color.ini` com a seção `[Classic]` e os 15 campos da spec.
- `user.css` só com o bloco `:root` das variáveis `--wa-*` e um comentário por área futura.
- `manifest.json` com os campos obrigatórios do Marketplace e `include` apontando para o jsdelivr do `theme.js` em `main`.
- Symlink do repo em `~/.config/spicetify/Themes/WinampClassic`, `spicetify config current_theme WinampClassic color_scheme Classic` e `spicetify apply` com o Spotify abrindo na paleta nova.
- `.gitignore` com `node_modules`.

## Acceptance Criteria
- [ ] Toda dependência chave fixada na versão estável mais recente consultada no registry na hora (`npm view <pkg> version`), nunca de cabeça: Node, pnpm, eslint, stylelint, typescript, vitest. Ficar numa linha anterior exige motivo anotado nesta issue.
- [ ] `pnpm check` verde com 0 erros de lint, 0 erros de tipo e o teste placeholder passando.
- [ ] `pnpm build` gera `theme.js` sem erro.
- [ ] Spotify abre com o tema `WinampClassic` aplicado e as cores do `color.ini` visíveis.
- [ ] `spicetify watch -le` recarrega ao salvar `user.css` e `theme.js`.

## Dependencies
- nenhuma
