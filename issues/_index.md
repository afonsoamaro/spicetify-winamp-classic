# Winamp Classic: índice de issues

Fonte: `SPECS.md`. Tema para o Spicetify que recria o visual do Winamp 2.x com CSS, uma fonte pixel embutida e uma extensão pequena para espectro, marquee e barra de título. Publicável no Marketplace.

## Setup (fazer primeiro)
| Issue | Nome | Status | Dependências |
|-------|------|--------|--------------|
| FN-00 | Setup base e tríade de qualidade | todo | nenhuma |
| FN-00b | Repositório git e GitHub | todo | FN-00 |

## Prototype Issues (visual, só CSS)
| Issue | Nome | Status | Dependências |
|-------|------|--------|--------------|
| PP-01 | Base, fonte pixel e utilitários de bevel | todo | FN-00 |
| PP-02 | Barra de reprodução como painel principal | todo | PP-01 |
| PP-03 | Lista de faixas como janela de playlist | todo | PP-01 |
| PP-04 | Sidebar, top bar, navegação e scrollbars | todo | PP-01 |
| PP-05 | Cards, botões, inputs, modais, menus e capas | todo | PP-01 |

## Functional Issues (extensão e publicação)
| Issue | Nome | Status | Dependências |
|-------|------|--------|--------------|
| FN-01 | Esqueleto da extensão e script de build | todo | FN-00, PP-02 |
| FN-02 | Formatação de tempo e marquee do display | todo | FN-01 |
| FN-03 | Espectro sintético no display | todo | FN-01 |
| FN-04 | Espectro sincronizado com getAudioData (spike, opcional) | todo | FN-03 |
| FN-05 | Barra de título WINAMP | todo | FN-01, PP-02 |
| FN-06 | Publicação no Marketplace | todo | FN-00b, PP-01 a PP-05, FN-02, FN-03, FN-05 |

## Caminho crítico
FN-00 → FN-00b → PP-01 → PP-02 → FN-01 → FN-02 → FN-03 → FN-05 → FN-06.
PP-03, PP-04 e PP-05 são independentes entre si depois da PP-01. FN-04 pode ser fechada como não aplicável.
