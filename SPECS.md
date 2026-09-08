# Winamp Classic: tema para Spicetify

Data: 2026-09-07
Status: aprovado em conversa, aguardando `/break` para gerar as issues

## Objetivo

Tema para o Spicetify que recria o visual do Winamp 2.x com o skin base: painéis cinza-azulados com relevo 3D, displays pretos com texto verde LED em fonte pixel, playlist verde sobre preto com faixa selecionada em azul, espectro animado verde-amarelo-vermelho.
O tema é publicável no Marketplace do Spicetify e usável localmente durante o desenvolvimento.
Nenhum bitmap do skin original é copiado. Todo o visual é recriado com CSS, canvas e uma fonte pixel de licença livre.

## Fora de escopo

Skins .wsz de terceiros, modo shade, equalizador, substituição do player por componente próprio, esquemas de cor alternativos além do Classic.

## Ambiente alvo

Spicetify 2.44.0, Spotify 1.2.98 no macOS, Marketplace instalado.
A config do Spicetify já tem `inject_css 1`, `inject_theme_js 1` e `replace_colors 1`.

## Estrutura do repositório

Local: `~/code/afonsoamaro/spicetify-winamp-classic`. GitHub: `afonsoamaro/spicetify-winamp-classic`, público, tópico `spicetify-themes`.

```
spicetify-winamp-classic/
├── manifest.json
├── color.ini
├── user.css
├── theme.js
├── preview.png
├── README.md
├── LICENSE
├── SPECS.md
├── issues/
├── src/
│   ├── spectrum.js      # gerador de barras e decaimento de picos
│   ├── marquee.js       # texto do display e passo de rolagem
│   └── time.js          # formatação mm:ss
├── test/
│   ├── spectrum.test.js
│   ├── marquee.test.js
│   └── time.test.js
├── scripts/build.js     # concatena src/ + entrada DOM em theme.js
├── types/globals.d.ts   # tipos do Spicetify, copiados de ~/.spicetify
├── .github/workflows/ci.yml
├── .github/dependabot.yml
├── .nvmrc
├── package.json
├── tsconfig.json
├── eslint.config.js
└── .stylelintrc.json
```

### manifest.json

Campos obrigatórios do Marketplace: `name` "Winamp Classic", `description`, `preview` "preview.png", `usercss` "user.css", `schemes` "color.ini", `readme` "README.md".
`include` com a URL jsdelivr do `theme.js` no branch `main`, porque o Marketplace não carrega caminho relativo nem raw do GitHub nesse campo.
`authors` com o dono do repo. `tags` "retro", "winamp".

### Carregamento local

Symlink de `~/code/afonsoamaro/spicetify-winamp-classic` para `~/.config/spicetify/Themes/WinampClassic`.
`spicetify config current_theme WinampClassic color_scheme Classic` e `spicetify apply`.
O `theme.js` na raiz do tema é carregado pelo próprio Spicetify por causa do `inject_theme_js`. Não precisa registrar como extensão.
Durante o desenvolvimento, `spicetify watch -s` reaplica CSS e JS ao salvar.

### Carregamento pelo Marketplace

O Marketplace baixa `user.css` e `color.ini` do raw do GitHub e o `theme.js` da URL em `include`.
O `user.css` não pode depender de `url()` relativo, porque o Marketplace reescreve esses caminhos para o CDN e o carregamento local não. A fonte entra como data URI.

## Paleta (color.ini)

Um único esquema, `[Classic]`, com os 18 campos do `color.ini` padrão do Spicetify. Valores iniciais baseados no skin base do Winamp 2.x e no `pledit.txt` padrão. Ajuste fino é visual, dentro do Spotify.

| Campo | Valor | Uso |
|---|---|---|
| text | #00ff00 | verde LED dos displays e da playlist |
| subtext | #00b800 | verde apagado para texto secundário |
| main | #000000 | área de conteúdo, equivalente à janela de playlist |
| main-elevated | #1a1a22 | fundos de objetos acima do conteúdo |
| highlight | #0000c6 | hover em objetos do conteúdo |
| highlight-elevated | #0000c6 | hover em objetos elevados |
| sidebar | #2b2b38 | painel cinza-azulado |
| player | #2b2b38 | barra de reprodução |
| card | #1a1a22 | cards |
| shadow | #000000 | sombras |
| selected-row | #0000c6 | fundo da faixa selecionada, texto branco |
| button | #3c3c4c | botões com relevo |
| button-active | #00ff00 | botão ativo |
| button-disabled | #55555f | botão desabilitado |
| tab-active | #00ff00 | aba ativa |
| notification | #0000c6 | notificações |
| notification-error | #c60000 | erro |
| misc | #ff9900 | laranja dos sliders e do espectro |

Variáveis CSS auxiliares em `:root` no `user.css`, fora do `color.ini` porque não são cores do Spicetify: `--wa-bevel-light` #5a5a6e, `--wa-bevel-dark` #14141c, `--wa-titlebar-start` #1c1c2a, `--wa-titlebar-end` #3a3a52, `--wa-white` #ffffff.

## CSS por área (user.css)

Princípios: nenhum `border-radius`, relevo sempre por `box-shadow` inset (claro em cima e à esquerda, escuro embaixo e à direita), fonte pixel só onde o Winamp usava display ou playlist.
Cada área fica num bloco comentado e independente. Se um seletor do Spotify mudar, só aquele bloco degrada.

### Fonte

Silkscreen (SIL Open Font License), embutida como `@font-face` com `src: url(data:font/woff2;base64,...)`.
Aplicada via classe utilitária `--wa-font-pixel` nos displays, na lista de faixas e na barra de título. O restante do app mantém a fonte padrão do Spotify.

### Barra de reprodução

Fundo cinza do painel com bevel externo.
Bloco de informação da faixa vira display preto com título e artista em verde pixel. A extensão adiciona marquee e espectro dentro desse display.
Tempo decorrido e duração em verde pixel, com o tempo decorrido em tamanho maior, lembrando o contador do Winamp.
Botões de transporte quadrados, cinza com bevel, ícones em preto. Estado pressionado inverte o bevel.
Barra de progresso com trilha escura rebaixada e knob cinza retangular com bevel.
Volume com trilha em gradiente verde, amarelo e vermelho da esquerda para a direita e o mesmo knob.

### Lista de faixas

Fundo preto. Linhas em verde pixel. Faixa em reprodução em branco. Hover e seleção com fundo #0000c6 e texto branco.
Número da faixa, nome e artista na mesma linha, no formato `1. Artista - Título`, feito com CSS onde o DOM permite. Duração alinhada à direita.
Cabeçalho da tabela em cinza bevel, como a barra da janela de playlist.

### Sidebar, top bar e navegação

Mesmo painel cinza bevelado. Itens ativos em verde. Títulos de seção em faixa com o gradiente de barra de título e texto branco.

### Scrollbars

Trilha escura rebaixada, thumb cinza com bevel, sem arredondamento.

### Cards, botões, inputs, modais e menus

Bevel 3D e cantos retos em todos. Fundo de card em `card`, hover clareia o bevel. Menus de contexto com fundo do painel e itens em verde.

### Imagens de capa

Mantidas, mas com borda rebaixada de 2px para parecer embutidas no painel.

## Extensão (theme.js)

Um único arquivo carregado pelo Spicetify. Aguarda `Spicetify.Player` e `Spicetify.Platform` existirem antes de tocar no DOM.
Três injeções independentes. Cada uma roda dentro de try/catch e loga no console com prefixo `[winamp-classic]`. Uma falhar não impede as outras.
Reinjeção observada por `MutationObserver` na barra de reprodução, porque o Spotify remonta esse trecho em alguns fluxos.

### Espectro

Um `<canvas>` inserido no display da barra de reprodução, à direita do texto.
Vinte barras. A cada frame de `requestAnimationFrame`, enquanto `Spicetify.Player.isPlaying()` é verdadeiro, cada barra recebe um alvo pseudoaleatório suavizado e cai com decaimento constante quando o alvo é menor.
Cada barra tem um pico cinza que sobe com a barra e cai devagar, como no Winamp.
Cor por altura, de baixo para cima: verde, amarelo, laranja, vermelho, em degraus discretos de 1 pixel de altura de barra.
Com a reprodução pausada as barras decaem até zero e o loop para para não gastar CPU.
Se `Spicetify.getAudioData()` responder com segmentos, a intensidade dos alvos segue o loudness do segmento atual. Se rejeitar ou vier vazio, o modo sintético continua sem erro visível.

### Marquee

O texto do display é `Artista - Título` em maiúsculas, com `(mm:ss)` no fim, igual ao Winamp.
Quando o texto cabe no display, fica parado. Quando não cabe, rola para a esquerda um caractere a cada 200 ms com separador `  ***  ` entre voltas.
Reinicia no evento `songchange`.

### Barra de título

Faixa de 14 px acima da barra de reprodução com o gradiente de título, o texto "WINAMP" centralizado em branco pixel, e três quadrados decorativos à direita (minimizar, shade, fechar). São só visuais, sem ação.

### Módulos puros em src/

`spectrum.js` exporta `nextFrame(state, rng, playing)` e `colorForRow(row, total)`. Sem DOM.
`marquee.js` exporta `displayText(track)` e `scrollStep(text, offset, width)`. Sem DOM.
`time.js` exporta `formatTime(ms)`.
Como o Spicetify carrega um único arquivo, os módulos de `src/` e a entrada de DOM são concatenados no `theme.js` por `scripts/build.js`, um script Node sem bundler. O `theme.js` versionado é o artefato gerado.

## Fluxo de desenvolvimento

1. Symlink do repo em `~/.config/spicetify/Themes/WinampClassic`.
2. `spicetify config current_theme WinampClassic color_scheme Classic` e `spicetify apply`.
3. `spicetify watch -s` durante a edição.
4. Conferência visual com screenshot do Spotify em: Home, uma playlist, álbum, busca, Your Library, fila, menu de contexto, modal.

## Qualidade

- Lint: eslint no `theme.js`, `src/`, `scripts/` e `test/`. stylelint no `user.css` com regra que proíbe `border-radius` diferente de 0.
- Type check: `tsc --noEmit` com `checkJs`, `allowJs`, e o `globals.d.ts` do Spicetify copiado de `~/.spicetify/globals.d.ts` para `types/`.
- Testes: vitest nos módulos de `src/`, cobrindo decaimento de barra, queda de pico, cor por linha, texto do display com e sem overflow, passo do marquee com wrap e formatação de tempo incluindo horas.
- Build: `pnpm build` gera o `theme.js` a partir de `src/`. Entra no gate porque lint e typecheck verdes não provam que o artefato constrói.
- `pnpm check` roda os quatro: lint, typecheck, test e build. Precisa passar antes de qualquer commit.

## Publicação

Só depois da aprovação visual. Passos: preview.png tirado do Spotify, README com instalação manual e pelo Marketplace, tópico `spicetify-themes` no repo, e conferência de que o tema aparece no Marketplace.
Nenhum commit, push ou criação de repo remoto sem confirmação explícita.

## Riscos

- Seletores do Spotify mudam a cada release. Mitigação: blocos CSS independentes e guardas na extensão.
- `getAudioData` pode não responder. Mitigação: modo sintético é o padrão.
- Fonte pixel pequena pode ficar ilegível em telas de alta densidade. Mitigação: tamanho mínimo de 11px e uso restrito a displays e listas.

## Convenções da pasta afonsoamaro

O `CLAUDE.md` de `~/code/afonsoamaro` foi escrito para apps web e mobile. Este projeto é um tema de CSS e JS sem servidor, então parte das regras não se aplica. Registro aqui o que vale e o que fica de fora, com motivo.

### Aplica

- Ordem FN-00 (quádrupla verde no repo vazio) → FN-00b (git, GitHub, issues) → FN-01+. As issues nascem do `/break` sobre este SPECS.md e vivem em `issues/` com `_index.md`.
- Branch dedicada antes de qualquer commit, merge `--no-ff` com subject só.
- pnpm com `packageManager` fixado, `.nvmrc` na LTS atual, e `pnpm check` rodando `lint`, `typecheck`, `test` e `build`, a quádrupla do CLAUDE.md global. Versões consultadas na hora do scaffold, nunca de cabeça.
- CI com o molde do `omni-status` (`.github/workflows/ci.yml`) e `dependabot.yml` com npm e github-actions.
- Repo público desde o início, porque o Marketplace exige. Isso puxa as três obrigações de abrir repo: `/deploy-check` com gitleaks no histórico, licença MIT e README para quem chega frio. Como não há segredo nem `.env` neste projeto, o deploy-check se resume ao gitleaks.
- Tokens de tema: toda cor vive no `color.ini` ou nas variáveis `--wa-*` do `:root`. Cor literal em regra CSS é bug.
- Planejamento fica no repo.

### Não aplica

- Portas, Postgres, Redis, compose e `PORTS.md`: não há serviço.
- Clerk, `ownerId`, checklist de IDOR e exposição: não há backend nem dado de usuário.
- i18n com três línguas: a única string de interface é "WINAMP" na barra de título, que é marca visual e não texto traduzível.
- OpenTelemetry: não há runtime próprio para instrumentar. O log da extensão fica no console do Spotify com prefixo `[winamp-classic]`.
- Protótipo de tela entre `/specs` e `/break`: o visual alvo já existe (o Winamp 2.x). A conferência é feita direto no Spotify.
- Stack padrão (Next, Nest, Prisma): o Spicetify carrega arquivos estáticos. Ferramentas de build se limitam ao script de concatenação em Node.
