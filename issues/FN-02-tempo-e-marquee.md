# [FN-02] Formatação de tempo e marquee do display

## Type
Functional

## Description
O display da barra de reprodução mostra `ARTISTA - TÍTULO (mm:ss)` em maiúsculas e rola o texto quando não cabe, como o Winamp.

## User Flow
1. Uma faixa começa a tocar.
2. O display mostra o texto formatado. Se cabe, fica parado.
3. Se não cabe, rola um caractere para a esquerda a cada 200ms, com `  ***  ` entre voltas.
4. Ao trocar de faixa (`songchange`), o texto e o offset reiniciam.

## Requirements
- `src/time.js` exporta `formatTime(ms)` retornando `m:ss`, e `h:mm:ss` acima de uma hora. Valores negativos ou não numéricos retornam `0:00`.
- `src/marquee.js` exporta `displayText({ artist, title, durationMs })` e `scrollStep(text, offset, width)` que devolve a janela visível de `width` caracteres e o próximo offset com wrap.
- A injeção `marquee` em `src/dom.js` substitui o conteúdo de texto do display, mede a largura em caracteres a partir da largura do container e do tamanho da fonte, e usa `setInterval` de 200ms só quando o texto não cabe.
- Escuta `Spicetify.Player.addEventListener('songchange')` e limpa o intervalo no `cleanup`.
- Nomes vêm de `Spicetify.Player.data.item` com fallback para string vazia.

## Scenarios
### Happy Path
- Faixa curta: texto parado. Faixa longa: rola e volta ao início após o separador.

### Edge Cases
- Faixa sem artista (podcast): mostra só o título.
- Título com caracteres fora do ASCII: mantém, a fonte pixel faz fallback para monospace.
- Redimensionar a janela muda a largura: recalcula na próxima troca de faixa ou a cada 2s.

### Error Handling
- `Spicetify.Player.data` indefinido: display mostra `WINAMP` e nada quebra.

## Data Requirements
- Nenhum.

## External Dependencies
- Nenhuma.

## Acceptance Criteria
- [ ] Testes de `formatTime` com 0, 59s, 1min, 59min59s, 1h, negativo e `NaN`.
- [ ] Testes de `displayText` com e sem artista e com duração.
- [ ] Testes de `scrollStep` com texto menor que a largura (offset fixo), igual e maior (wrap com separador).
- [ ] No Spotify, o display rola com título longo e fica parado com título curto.
- [ ] `pnpm build` rodado e `theme.js` atualizado. `pnpm check` verde.

## Dependencies
- FN-01
