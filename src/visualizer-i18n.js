// @ts-check
// Interface labels of the visualizer, in the three languages the portfolio
// ships. Pure data: which locale to use is decided where the labels are read.

export const LABEL_KEYS = /** @type {const} */ ([
  'menuTitle',
  'windowTitle',
  'enabled',
  'style',
  'styleBars',
  'styleScope',
  'styleGlow',
  'surfaceFullscreen',
  'surfaceSidebar',
  'surfaceMiniplayer',
  'panelShow',
  'panelHide',
  'close',
  'fullscreenToggle',
  'signalNote',
]);

/** @typedef {Record<typeof LABEL_KEYS[number], string>} Labels */

/** @type {Record<'en' | 'pt' | 'es', Labels>} */
const LABEL_SETS = {
  en: {
    menuTitle: 'Visualizer',
    windowTitle: 'Visualizer settings',
    enabled: 'Visualizer on',
    style: 'Style',
    styleBars: 'Bars',
    styleScope: 'Oscilloscope',
    styleGlow: 'Glow',
    surfaceFullscreen: 'Fullscreen',
    surfaceSidebar: 'Right sidebar',
    surfaceMiniplayer: 'Miniplayer background',
    panelShow: 'Show visualizer',
    panelHide: 'Hide visualizer',
    close: 'Close',
    fullscreenToggle: 'Visualizer',
    signalNote: 'Simulated signal, not the audio that is playing.',
  },
  pt: {
    menuTitle: 'Visualizador',
    windowTitle: 'Configurações do visualizador',
    enabled: 'Visualizador ativado',
    style: 'Estilo',
    styleBars: 'Barras',
    styleScope: 'Osciloscópio',
    styleGlow: 'Brilho',
    surfaceFullscreen: 'Tela cheia',
    surfaceSidebar: 'Barra lateral direita',
    surfaceMiniplayer: 'Fundo do miniplayer',
    panelShow: 'Mostrar visualizador',
    panelHide: 'Ocultar visualizador',
    close: 'Fechar',
    fullscreenToggle: 'Visualizador',
    signalNote: 'Sinal simulado, não o áudio que está tocando.',
  },
  es: {
    menuTitle: 'Visualizador',
    windowTitle: 'Ajustes del visualizador',
    enabled: 'Visualizador activado',
    style: 'Estilo',
    styleBars: 'Barras',
    styleScope: 'Osciloscopio',
    styleGlow: 'Brillo',
    surfaceFullscreen: 'Pantalla completa',
    surfaceSidebar: 'Barra lateral derecha',
    surfaceMiniplayer: 'Fondo del miniplayer',
    panelShow: 'Mostrar visualizador',
    panelHide: 'Ocultar visualizador',
    close: 'Cerrar',
    fullscreenToggle: 'Visualizador',
    signalNote: 'Señal simulada, no el audio que se está reproduciendo.',
  },
};

/**
 * Labels for a locale such as `pt-BR`, `es-MX` or `en`; anything else gets English.
 * @param {string | undefined} locale
 * @returns {Labels}
 */
export function labelsFor(locale) {
  const language = (locale ?? '').toLowerCase().split(/[-_]/)[0];
  if (language === 'pt') return LABEL_SETS.pt;
  if (language === 'es') return LABEL_SETS.es;
  return LABEL_SETS.en;
}
