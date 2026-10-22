(() => {
  // The retired toggle preference must never suppress a new page's intro.
  try { localStorage.removeItem('pintu.logo-motion.v1'); } catch {}

  let openingTimer;
  const playOpening = () => {
    clearTimeout(openingTimer);
    const logos = [...document.querySelectorAll('.pt-logo')];
    logos.forEach(logo => logo.classList.remove('pt-opening'));
    openingTimer = setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        logos.forEach(logo => logo.classList.add('pt-opening'));
      }));
    }, 250);
  };
  if (document.readyState !== 'complete') {
    window.addEventListener('load', playOpening, { once: true });
  } else {
    playOpening();
  }
  window.addEventListener('pageshow', event => { if (event.persisted) playOpening(); });
})();
