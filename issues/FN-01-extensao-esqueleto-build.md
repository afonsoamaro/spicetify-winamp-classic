# [FN-01] Esqueleto da extensão e script de build

## Type
Functional

## Description
O `theme.js` ganha a estrutura que as injeções seguintes usam: espera o Spicetify ficar pronto, localiza o display na barra de reprodução, reinjeta quando o Spotify remonta o DOM, e isola cada injeção em try/catch com log prefixado. O `scripts/build.js` concatena os módulos de `src/` com a entrada de DOM.

## User Flow
1. Spotify abre com o tema aplicado.
2. A extensão espera `Spicetify.Player` e `Spicetify.Platform` existirem, com polling de 100ms e desistência após 30s com log de erro.
3. Localiza o container do display (criado pelo CSS da PP-02) e registra as injeções.
4. Um `MutationObserver` na barra de reprodução reexecuta as injeções quando o container some e volta.

## Requirements
- `src/dom.js` com `waitForSpicetify()`, `findDisplay()` e `mount(injections)`, onde cada injeção é `{ name, run, cleanup }`.
- Cada `run` roda em try/catch. Falha loga `console.warn('[winamp-classic] <name>:', err)` e não impede as outras.
- `cleanup` é chamado antes de reinjetar para não duplicar canvas ou marquee.
- `scripts/build.js` lê `src/*.js` em ordem fixa, remove `export` e `import`, embrulha tudo numa IIFE e escreve `theme.js`. Sem bundler.
- `theme.js` versionado é o artefato gerado. `pnpm build` precisa rodar antes de commitar mudanças em `src/`.

## Scenarios
### Happy Path
- Spotify abre, a extensão monta, log `[winamp-classic] mounted` no console.

### Edge Cases
- Barra de reprodução remontada ao trocar de dispositivo: as injeções voltam sem duplicar.
- Display não encontrado porque um seletor mudou: log de aviso, o resto do tema segue.

### Error Handling
- Timeout de 30s esperando o Spicetify: um único `console.error` e a extensão para.

## Data Requirements
- Nenhum.

## External Dependencies
- Tipos do Spicetify em `types/globals.d.ts`.

## Acceptance Criteria
- [ ] `pnpm build` gera `theme.js` como IIFE sem `import` ou `export`.
- [ ] Teste de vitest para o build: entrada com dois módulos vira um arquivo sem `export` e com a ordem esperada.
- [ ] Teste de vitest para `mount`: injeção que lança não impede a seguinte e o `cleanup` roda antes da reinjeção (DOM simulado com jsdom).
- [ ] No Spotify, o console mostra `[winamp-classic] mounted` e a reinjeção funciona ao trocar de dispositivo.
- [ ] `pnpm check` verde.

## Dependencies
- FN-00, PP-02
