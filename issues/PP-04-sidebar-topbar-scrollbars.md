# [PP-04] Prototype: sidebar, top bar, navegação e scrollbars

## Type
Prototype (visual only)

## Description
O chrome do app (sidebar Your Library, top bar com busca e navegação, cabeçalhos de seção, scrollbars) vira painel cinza bevelado com faixas de título no gradiente clássico.

## Visual Elements
- Sidebar e top bar com fundo `var(--spice-sidebar)` e bevel saliente na borda.
- Itens de navegação em verde, item ativo em `var(--spice-tab-active)` com bevel rebaixado.
- Títulos de seção (Your Library, Home, nome da playlist no cabeçalho) como faixa de 14px com gradiente de `--wa-titlebar-start` a `--wa-titlebar-end` e texto branco pixel.
- Campo de busca como display preto rebaixado com texto verde pixel.
- Botões de voltar e avançar quadrados com bevel.
- Scrollbars com trilha escura rebaixada e thumb `var(--spice-button)` com bevel saliente, largura 12px, sem arredondamento.
- Divisórias entre painéis com linha clara e linha escura, como o Winamp separa janelas.

## Layout Notes
- Blocos comentados `/* === Sidebar === */`, `/* === Top bar === */`, `/* === Scrollbars === */`.
- Não mudar larguras nem esconder elementos. Só cor, relevo e fonte.

## Mock Data
- Biblioteca com playlists, álbuns e artistas. Busca com resultados.

## Acceptance Criteria
- [ ] Sidebar, top bar e cabeçalhos com painel cinza e faixas de título.
- [ ] Scrollbars retangulares com bevel em todas as áreas roláveis.
- [ ] Campo de busca como display preto.
- [ ] Redimensionar a sidebar continua funcionando.
- [ ] Screenshot em `docs/screenshots/sidebar.png`.

## Dependencies
- PP-01
