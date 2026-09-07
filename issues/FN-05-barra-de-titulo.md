# [FN-05] Barra de título WINAMP

## Type
Functional

## Description
Uma faixa de 14px acima da barra de reprodução com o gradiente clássico, o texto "WINAMP" centralizado em branco pixel e três quadrados decorativos à direita (minimizar, shade, fechar), só visuais.

## User Flow
1. Spotify abre com o tema.
2. A faixa aparece no topo da barra de reprodução e permanece ao trocar de tela.

## Requirements
- Injeção `titlebar` em `src/dom.js` cria um `div` com classe `wa-titlebar` como primeiro filho da barra de reprodução, contendo o texto e três `span` decorativos.
- O estilo vem do `user.css`: gradiente de `--wa-titlebar-start` a `--wa-titlebar-end`, texto `--wa-white` na fonte pixel, quadrados de 9px com bevel saliente.
- A altura da barra de reprodução aumenta 14px via CSS para acomodar a faixa sem cobrir os controles.
- `cleanup` remove o `div`. A reinjeção não duplica.
- Os quadrados não têm handler de clique.

## Scenarios
### Happy Path
- Faixa visível em todas as telas, sem sobrepor a barra de progresso.

### Edge Cases
- Miniplayer ou tela cheia: a faixa segue a barra ou some junto com ela, sem sobrar no DOM.

### Error Handling
- Barra de reprodução não encontrada: log de aviso e nada é inserido.

## Data Requirements
- Nenhum.

## External Dependencies
- Nenhuma.

## Acceptance Criteria
- [ ] Teste de vitest com jsdom: a injeção insere um único `.wa-titlebar` mesmo rodando duas vezes, e o `cleanup` remove.
- [ ] No Spotify, a faixa aparece sem cobrir os controles e sem duplicar após trocar de dispositivo.
- [ ] `pnpm build` rodado e `theme.js` atualizado. `pnpm check` verde.

## Dependencies
- FN-01, PP-02
