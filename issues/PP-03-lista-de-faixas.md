# [PP-03] Prototype: lista de faixas como janela de playlist

## Type
Prototype (visual only)

## Description
Toda lista de faixas (playlist, álbum, fila, resultados de busca) vira a janela de playlist do Winamp: preto, verde pixel, faixa atual em branco, seleção em azul.

## Visual Elements
- Fundo `var(--spice-main)` preto na tabela e no container.
- Linhas em `var(--spice-text)` com a fonte pixel em 12px.
- Faixa em reprodução em `var(--wa-white)`.
- Hover e seleção com fundo `var(--spice-selected-row)` e texto branco.
- Número, artista e título na mesma linha no formato `1. Artista - Título`, feito com CSS onde o DOM permite. Onde não permitir, manter as colunas do Spotify e só aplicar cor e fonte.
- Duração alinhada à direita em verde.
- Cabeçalho da tabela com fundo do painel, bevel saliente e texto branco, como a barra da janela de playlist.
- Botões de ação da linha (curtir, mais opções) em verde, sem fundo.

## Layout Notes
- Bloco comentado `/* === Lista de faixas === */`.
- Cobrir as variantes de lista: playlist, álbum, fila, busca, artista.

## Mock Data
- Playlist com mais de 50 faixas e uma tocando. Álbum. Fila.

## Acceptance Criteria
- [ ] As cinco variantes de lista aparecem verde sobre preto com a faixa atual em branco.
- [ ] Hover e seleção em azul com texto branco.
- [ ] Cabeçalho com bevel e sem arredondamento.
- [ ] Scroll e clique continuam funcionando.
- [ ] Screenshot em `docs/screenshots/playlist.png`.

## Dependencies
- PP-01
