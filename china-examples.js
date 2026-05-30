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
