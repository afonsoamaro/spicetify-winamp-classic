# [FN-03] Espectro sintético no display

## Type
Functional

## Description
Um canvas ao lado do texto do display mostra 20 barras que sobem e caem enquanto a música toca, com cores verde, amarelo, laranja e vermelho de baixo para cima e picos cinza que caem devagar, como o analisador do Winamp. O movimento é sintético porque o Spotify não expõe o áudio.

## User Flow
1. Faixa tocando: barras se mexem a 60fps.
2. Pausa: barras decaem até zero e o loop de animação para.
3. Play de novo: o loop volta.

## Requirements
- `src/spectrum.js` exporta `createState(bars)`, `nextFrame(state, rng, playing)` e `colorForRow(row, totalRows)`.
- `nextFrame`: com `playing` verdadeiro, cada barra recebe um alvo `rng()` suavizado com o alvo anterior (peso 0.7 no anterior). A barra sobe direto ao alvo se ele for maior e cai 0.06 por frame se for menor. Com `playing` falso, o alvo é 0.
- Pico por barra: sobe junto com a barra, e quando a barra está abaixo do pico o pico espera 15 frames e depois cai 0.02 por frame.
- `colorForRow`: os 25% de baixo verde, os 25% seguintes amarelo, os 25% seguintes laranja (`--spice-misc`) e o topo vermelho.
- A injeção `spectrum` em `src/dom.js` cria um `<canvas>` de 76x16 pixels CSS com `devicePixelRatio`, desenha barras de 3px com 1px de espaço e o pico como linha de 1px cinza, e usa `requestAnimationFrame` só enquanto `Spicetify.Player.isPlaying()` for verdadeiro ou houver barra acima de zero.
- Escuta `onplaypause` para religar o loop. `cleanup` cancela o frame e remove o canvas.
- `rng` é injetável para os testes serem determinísticos.

## Scenarios
### Happy Path
- Música tocando: barras vivas, picos caindo com atraso.

### Edge Cases
- Spotify em segundo plano com a janela oculta: o `requestAnimationFrame` pausa sozinho, sem tratamento extra.
- Display estreito demais para o canvas: o CSS esconde o canvas abaixo de 200px de largura de display.

### Error Handling
- `getContext('2d')` retorna nulo: a injeção loga e desiste.

## Data Requirements
- Nenhum.

## External Dependencies
- Nenhuma.

## Acceptance Criteria
- [ ] Testes de `nextFrame`: barra sobe ao alvo, cai 0.06 por frame, vai a zero quando pausado, pico segura 15 frames e depois cai.
- [ ] Testes de `colorForRow` nas quatro faixas e nas bordas.
- [ ] No Spotify, barras se mexem tocando e param após a pausa. Uso de CPU do Spotify pausado igual ao sem extensão (conferir no Activity Monitor).
- [ ] `pnpm build` rodado e `theme.js` atualizado. `pnpm check` verde.

## Dependencies
- FN-01
