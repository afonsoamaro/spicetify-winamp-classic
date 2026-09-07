# [PP-01] Prototype: base, fonte pixel e utilitários de bevel

## Type
Prototype (visual only)

## Description
Fundação do `user.css`: a fonte pixel embutida, as classes utilitárias de relevo 3D e a remoção global de cantos arredondados. Tudo que as outras PP usam.

## Visual Elements
- `@font-face` da Silkscreen (SIL OFL) com `src: url(data:font/woff2;base64,...)`, gerada a partir do woff2 oficial por um script Node único em `scripts/embed-font.js`.
- Variáveis em `:root`: `--wa-bevel-light` #5a5a6e, `--wa-bevel-dark` #14141c, `--wa-titlebar-start` #1c1c2a, `--wa-titlebar-end` #3a3a52, `--wa-white` #ffffff, `--wa-font-pixel` com a Silkscreen e fallback monospace.
- Mixins via seletores utilitários reaproveitáveis dentro do CSS: relevo saliente (claro em cima e à esquerda, escuro embaixo e à direita) e relevo rebaixado (o inverso), sempre por `box-shadow` inset de 1px.
- Regra global `border-radius: 0` em todo elemento do app.

## Layout Notes
- Fonte pixel em tamanho mínimo de 11px e só onde as PP seguintes pedirem. O restante do app segue a fonte padrão do Spotify.
- Nenhuma cor literal fora de `:root` e do `color.ini`. Regras usam `var(--spice-*)` e `var(--wa-*)`.

## Mock Data
- Não se aplica. A conferência é no Spotify com a paleta do FN-00.

## Acceptance Criteria
- [ ] A fonte carrega no Spotify local sem requisição externa (conferir no DevTools que não há request de fonte).
- [ ] Nenhum elemento do app tem canto arredondado.
- [ ] stylelint verde, sem `border-radius` diferente de 0 e sem cor literal fora de `:root`.
- [ ] O `user.css` continua abaixo de 200 KB com a fonte embutida.

## Dependencies
- FN-00
