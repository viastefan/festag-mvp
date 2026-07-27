/**
 * Auth canvas chrome — keep plates transparent so FestagAmbient shows through.
 * (Atmosphere itself lives in components/ambient/FestagAmbient.)
 */
export const AUTH_SAND_AMBIENT_STYLES = `
  .al-root .al-container,
  .al-root .al-header,
  .dl-root .dl-container,
  .dl-root .dl-header {
    background: transparent;
  }
  .al-root[data-theme="dark"] .al-header,
  .dl-root[data-theme="dark"] .dl-header {
    background: transparent;
  }
  .ae-root {
    position: relative;
  }
`
