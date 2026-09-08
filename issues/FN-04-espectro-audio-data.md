# [FN-04] Espectro sincronizado com getAudioData, se disponível

## Type
Functional (opcional, começa com spike)

## Description
Se `Spicetify.getAudioData()` ainda responder no client desktop, a intensidade das barras segue o loudness do segmento atual da faixa. Se não responder, nada muda: o modo sintético da FN-03 continua.

## User Flow
1. Na troca de faixa, a extensão chama `Spicetify.getAudioData()`.
2. Se vier `segments`, a cada frame o alvo das barras é escalado pelo loudness do segmento correspondente a `Spicetify.Player.getProgress()`.
3. Se rejeitar ou vier vazio, a extensão segue no modo sintético sem log de erro visível ao usuário.

## Requirements
- Passo 1 é um spike: chamar `Spicetify.getAudioData()` no console do Spotify com três faixas diferentes e registrar nesta issue se responde e com que formato. Se não responder em nenhuma, fechar a issue como "não aplicável" com a evidência, sem código.
- Se responder: `src/spectrum.js` ganha `loudnessAt(segments, progressMs)` que retorna um fator entre 0 e 1 normalizado pelo `loudness_max` dos segmentos.
- `nextFrame` aceita um `intensity` opcional que multiplica os alvos.
- Chamada de `getAudioData` uma vez por faixa, no `songchange`, com cache do resultado. Falha é `console.debug`, não `warn`.

## Scenarios
### Happy Path
- Faixa com análise: barras acompanham a dinâmica da música.

### Edge Cases
- Faixa sem análise (local, podcast): modo sintético.
- Progresso além do último segmento: usa o último.

### Error Handling
- Promise rejeitada ou timeout de 5s: modo sintético.

## Data Requirements
- Nenhum persistido.

## External Dependencies
- Endpoint interno `wg://audio-attributes/v1/audio-analysis/` via `Spicetify.getAudioData`.

## Acceptance Criteria
- [ ] Resultado do spike registrado nesta issue com as três faixas testadas.
- [ ] Se implementado: testes de `loudnessAt` com progresso antes, dentro e depois dos segmentos, e de `nextFrame` com `intensity`.
- [ ] Se implementado: faixa sem análise continua com espectro sintético, sem erro no console.
- [ ] `pnpm build` rodado e `theme.js` atualizado. `pnpm check` verde.

## Dependencies
- FN-03
