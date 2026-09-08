# [PP-02] Prototype: barra de reprodução como painel principal do Winamp

## Type
Prototype (visual only)

## Description
A barra de reprodução do Spotify vira o painel principal do Winamp 2.x: cinza com relevo, display preto com texto verde em fonte pixel, botões quadrados 3D e sliders com knob retangular. Só CSS. O marquee, o espectro e a barra de título vêm nas FN.

## Visual Elements
- Fundo `var(--spice-player)` com bevel saliente na borda externa.
- Bloco de informação da faixa como display preto rebaixado, título e artista em `var(--spice-text)` na fonte pixel, com espaço reservado à direita para o canvas do espectro (FN-03).
- Tempo decorrido em fonte pixel maior que a duração, os dois em verde.
- Botões de transporte (anterior, play/pause, próximo, shuffle, repeat) quadrados, fundo `var(--spice-button)`, bevel saliente, ícone em preto. Estado pressionado e ativo com bevel rebaixado.
- Barra de progresso com trilha escura rebaixada e knob cinza retangular com bevel, altura da trilha de 10px.
- Volume com trilha em gradiente verde, amarelo e vermelho da esquerda para a direita e o mesmo knob.
- Botões da direita (fila, dispositivos, lyrics, miniplayer) no mesmo estilo dos botões de transporte.
- Capa da faixa com borda rebaixada de 2px.

## Layout Notes
- Manter a altura padrão da barra do Spotify para não quebrar o layout do restante do app.
- Seletores agrupados num único bloco comentado `/* === Barra de reprodução === */`, independente das outras áreas.

## Mock Data
- Qualquer faixa tocando. Conferir com título longo e curto.

## Acceptance Criteria
- [ ] Barra renderiza com painel cinza, display preto e texto verde pixel.
- [ ] Botões, progresso e volume com relevo e sem arredondamento.
- [ ] Estados hover, pressionado e ativo dos botões visíveis.
- [ ] Nenhum controle perdeu clique ou arrasto.
- [ ] Screenshot da barra salvo em `docs/screenshots/player.png`.

## Dependencies
- PP-01
