# [PP-05] Prototype: cards, botões, inputs, modais, menus e capas

## Type
Prototype (visual only)

## Description
O restante do app recebe o mesmo relevo 3D e cantos retos: cards da Home, botões genéricos, inputs, modais, menus de contexto, tooltips e imagens de capa.

## Visual Elements
- Cards com fundo `var(--spice-card)`, bevel saliente, hover clareando a borda clara. Título do card em verde, subtítulo em `var(--spice-subtext)`.
- Botões primários com fundo `var(--spice-button)`, bevel saliente, texto preto. Pressionado inverte o bevel.
- Botões secundários e de ícone só com bevel, sem preenchimento.
- Inputs e selects como display preto rebaixado com texto verde.
- Modais com fundo do painel, bevel saliente e faixa de título com gradiente e texto branco pixel.
- Menus de contexto e dropdowns com fundo do painel, itens em verde, item em hover com fundo azul e texto branco.
- Tooltips pretos com texto verde pixel.
- Capas e avatares com borda rebaixada de 2px e sem arredondamento, incluindo avatar redondo do perfil.
- Toasts e notificações com fundo `var(--spice-notification)` e texto branco.

## Layout Notes
- Blocos comentados por elemento. Manter tamanhos e espaçamentos do Spotify.

## Mock Data
- Home com cards, menu de contexto de uma faixa, modal de criar playlist, tooltip de qualquer botão.

## Acceptance Criteria
- [ ] Cards, botões, inputs e modais com bevel e sem arredondamento.
- [ ] Menu de contexto e dropdowns no estilo painel com hover azul.
- [ ] Capas e avatares quadrados com borda rebaixada.
- [ ] Nenhum texto ficou ilegível por contraste.
- [ ] Screenshots em `docs/screenshots/home.png`, `docs/screenshots/context-menu.png` e `docs/screenshots/modal.png`.

## Dependencies
- PP-01
