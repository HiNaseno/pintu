const activeAnimations = new WeakMap();

const animateScroll = (element, axis, target, duration) => {
  const previous = activeAnimations.get(element);
  if (previous) cancelAnimationFrame(previous);

  const property = axis === "x" ? "scrollLeft" : "scrollTop";
  const start = element[property];
  const distance = target - start;
  const startedAt = performance.now();

  const easeInOut = (progress) => {
    if (progress < 0.5) return 2 * progress * progress;
    return 1 - Math.pow(-2 * progress + 2, 2) / 2;
  };

  const step = (time) => {
    const progress = Math.min((time - startedAt) / duration, 1);
    element[property] = start + distance * easeInOut(progress);
    if (progress < 1) {
      activeAnimations.set(element, requestAnimationFrame(step));
    } else {
      activeAnimations.delete(element);
    }
  };

  activeAnimations.set(element, requestAnimationFrame(step));
};

document.querySelectorAll(".detail-stream").forEach((stream) => {
  stream.addEventListener("pointerenter", () => {
    animateScroll(stream, "y", stream.scrollHeight - stream.clientHeight, 2600);
  });

  stream.addEventListener("pointerleave", () => {
    animateScroll(stream, "y", 0, 900);
  });
});

document.querySelectorAll(".sku-gallery").forEach((gallery) => {
  const strip = gallery.querySelector(".sku-strip");
  if (!strip) return;

  gallery.addEventListener("pointerenter", () => {
    animateScroll(strip, "x", strip.scrollWidth - strip.clientWidth, 1700);
  });

  gallery.addEventListener("pointerleave", () => {
    animateScroll(strip, "x", 0, 700);
  });
});

/* =====================================================================
   2026-06-13 视觉升级：照片加载兜底 + 滚动进场
   ===================================================================== */
(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  const photoFallback = {
    "storage-main": "case-storage-main",
    "storage-scene": "case-storage-spec",
    "storage-detail": "case-storage-detail",
    "bottle-main": "case-bottle-main",
    "bottle-spec": "case-bottle-spec",
    "bottle-pack": "case-bottle-pack",
    "kitchen-main": "case-kitchen-main",
    "kitchen-detail": "case-kitchen-detail",
    "kitchen-set": "case-kitchen-set",
    "humidifier-main": "case-humidifier-main",
    "humidifier-detail": "case-humidifier-detail",
  };

  document.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fellBack) {
        return;
      }
      const match = (img.currentSrc || img.src).match(/\/photos\/([a-z0-9-]+)\.jpg/i);
      const svg = match && photoFallback[match[1]];
      if (!svg) {
        return;
      }
      img.dataset.fellBack = "1";
      img.src = `./assets/${svg}.svg`;
    },
    true,
  );

  if (!prefersReduced.matches && "IntersectionObserver" in window) {
    const targets = document.querySelectorAll(".case-scene, .final-cta");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((el) => {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }
})();
