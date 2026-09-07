# [FN-06] Publicação no Marketplace

## Type
Functional

## Description
Deixar o tema instalável pelo Marketplace do Spicetify e documentado para quem chega frio.

## User Flow
1. Usuário abre o Marketplace no Spotify, busca "Winamp Classic" e instala.
2. O tema aplica cores, CSS e a extensão do `include` sem passo manual.

## Requirements
- `preview.png` tirado do Spotify com o tema completo, proporção 16:9, mostrando barra de reprodução com espectro e uma playlist.
- `README.md` final: o que é, screenshot, instalação pelo Marketplace, instalação manual (clone, symlink, `spicetify config`, `spicetify apply`), como desenvolver (`pnpm check`, `pnpm build`, `spicetify watch -s`), licença, nota de que nenhum asset do Winamp original é usado.
- `manifest.json` revisado: `include` apontando para `https://cdn.jsdelivr.net/gh/afonsoamaro/spicetify-winamp-classic@main/theme.js`, `tags`, `authors`.
- Tópico `spicetify-themes` no repo GitHub.
- Teste de ponta a ponta: remover o tema local, `spicetify config current_theme marketplace`, instalar pelo Marketplace e conferir que CSS, cores e extensão carregam.
- Cache do jsdelivr: após mudar `theme.js` na `main`, o CDN pode servir a versão antiga por até 24h. Documentar no README como purgar (`https://purge.jsdelivr.net/gh/...`).

## Scenarios
### Happy Path
- Tema aparece no Marketplace em até algumas horas após o tópico e instala completo.

### Edge Cases
- Marketplace instala mas a extensão não carrega: conferir a URL do `include` e o cache do jsdelivr.

### Error Handling
- Tema não aparece na busca do Marketplace: conferir tópico, `manifest.json` na raiz e branch padrão `main`.

## Data Requirements
- Nenhum.

## External Dependencies
- GitHub, jsdelivr, Marketplace do Spicetify.

## Acceptance Criteria
- [ ] `preview.png` e `README.md` finais na `main`.
- [ ] Tema instalado pelo Marketplace numa config limpa carrega CSS, cores e extensão.
- [ ] `pnpm check` verde e CI verde na `main`.

## Dependencies
- FN-00b, PP-01 a PP-05, FN-02, FN-03, FN-05
