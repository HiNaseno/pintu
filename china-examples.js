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

document.querySelectorAll(".sku-gallery").forEach((gallery) => {
  const strip = gallery.querySelector(".sku-strip");
  if (!strip) return;
  const canAnimate = () => window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches;

  gallery.addEventListener("pointerenter", () => {
    if (!canAnimate()) return;
    animateScroll(strip, "x", strip.scrollWidth - strip.clientWidth, 1700);
  });

  gallery.addEventListener("pointerleave", () => {
    if (!canAnimate()) return;
    animateScroll(strip, "x", 0, 700);
  });
});

/* =====================================================================
   2026-06-13 视觉升级：照片加载兜底 + 滚动进场
   ===================================================================== */
(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  const photoFallback = {
    "storage-poster": "storage-v3-main.jpg",
    "storage-main": "storage-v3-main.jpg",
    "storage-detail": "storage-v2-detail.jpg",
    "storage-set": "storage-v2-set.jpg",
    "kitchen-poster": "kitchen-v3-main.jpg",
    "kitchen-main": "kitchen-v3-main.jpg",
    "kitchen-detail": "kitchen-v3-main.jpg",
    "kitchen-set": "kitchen-v2-set.jpg",
    "humidifier-poster": "humidifier-v3-main.jpg",
    "humidifier-main": "humidifier-v3-main.jpg",
    "humidifier-detail": "humidifier-v3-main.jpg",
  };

  const sneakerFallback = {
    "sneaker-poster": "sneaker-poster.jpg",
    "sneaker-main": "sneaker-main.jpg",
    "sneaker-detail": "sneaker-detail.jpg",
    "sneaker-colors": "sneaker-colors.jpg",
    "sneaker-sage": "sneaker-sage.jpg",
    "sneaker-navy": "sneaker-navy.jpg",
  };

  const usePhotoFallback = (img) => {
    if (!(img instanceof HTMLImageElement) || img.dataset.fellBack) return;
    const match = (img.currentSrc || img.src).match(/\/(examples-v4|examples-nike-v1)\/([a-z0-9-]+)\.webp(?:[?#]|$)/i);
    const isSneaker = match?.[1] === "examples-nike-v1";
    const filename = match && (isSneaker ? sneakerFallback[match[2]] : photoFallback[match[2]]);
    if (!filename) return;
    img.dataset.fellBack = "1";
    img.src = `./assets/${isSneaker ? "examples-nike-v1" : "photos"}/${filename}`;
  };

  document.addEventListener("error", (event) => usePhotoFallback(event.target), true);
  document.querySelectorAll("img").forEach((img) => {
    if (img.complete && !img.naturalWidth) usePhotoFallback(img);
  });

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
