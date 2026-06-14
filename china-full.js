const homeTabs = document.querySelectorAll("[data-home-tab]");
const homePanels = document.querySelectorAll("[data-home-panel]");
const heroPanel = document.querySelector(".hero-panel");
const heroVisual = document.querySelector(".hero-visual");
const capabilityConsole = document.querySelector(".capability-console");
const capabilityNav = document.querySelector(".capability-nav");
const capabilityGroups = document.querySelectorAll("[data-capability-stage]");
const flowSteps = document.querySelectorAll("[data-flow-stage]");
const capabilityOrder = ["product", "logo", "style", "retouch", "export", "refine"];
const capabilityStages = {
  product: "create",
  logo: "create",
  style: "polish",
  retouch: "polish",
  export: "deliver",
  refine: "deliver",
};

const setActiveTab = (target) => {
  homeTabs.forEach((tab) => {
    const isActive = tab.dataset.homeTab === target;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  homePanels.forEach((panel) => {
    const isActive = panel.dataset.homePanel === target;
    panel.classList.toggle("active", isActive);
    panel.setAttribute("aria-hidden", String(!isActive));
    panel.toggleAttribute("inert", !isActive);
  });

  const currentStage = capabilityStages[target];
  let activeGroup = null;

  capabilityGroups.forEach((group) => {
    const isActive = group.dataset.capabilityStage === currentStage;
    group.classList.toggle("active", isActive);
    if (isActive) {
      activeGroup = group;
    }
  });

  flowSteps.forEach((step) => {
    step.classList.toggle("active", step.dataset.flowStage === currentStage);
  });

  if (capabilityNav && activeGroup && window.innerWidth <= 720) {
    capabilityNav.scrollTo({
      left: Math.max(0, activeGroup.offsetLeft - 10),
      behavior: "smooth",
    });
  }
};

if (capabilityConsole && homeTabs.length) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let autoTimer = 0;
  let resumeTimer = 0;
  let isVisible = false;
  let isHovering = false;
  let userPauseUntil = 0;

  const isConsoleInView = () => {
    const rect = capabilityConsole.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return visibleHeight / Math.max(rect.height, 1) >= 0.28;
  };

  const stopAutoPlay = () => {
    window.clearTimeout(autoTimer);
    autoTimer = 0;
    capabilityConsole.classList.remove("is-autoplaying");
  };

  const scheduleAutoPlay = (delay = 4000) => {
    stopAutoPlay();

    if (
      (!isVisible && !isConsoleInView()) ||
      isHovering ||
      reducedMotion.matches ||
      document.hidden ||
      Date.now() < userPauseUntil
    ) {
      return;
    }

    capabilityConsole.classList.add("is-autoplaying");
    autoTimer = window.setTimeout(() => {
      const activeTarget = document.querySelector("[data-home-tab].active")?.dataset.homeTab;
      const currentIndex = Math.max(0, capabilityOrder.indexOf(activeTarget));
      setActiveTab(capabilityOrder[(currentIndex + 1) % capabilityOrder.length]);
      scheduleAutoPlay();
    }, delay);
  };

  const pauseAfterInteraction = (delay = 9000) => {
    stopAutoPlay();
    window.clearTimeout(resumeTimer);
    userPauseUntil = Date.now() + delay;
    capabilityConsole.classList.add("is-paused");
    resumeTimer = window.setTimeout(() => {
      userPauseUntil = 0;
      capabilityConsole.classList.remove("is-paused");
      scheduleAutoPlay();
    }, delay);
  };

  homeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setActiveTab(tab.dataset.homeTab);
      pauseAfterInteraction();
    });

    tab.addEventListener("pointerenter", () => {
      if (!finePointer.matches) {
        return;
      }

      isHovering = true;
      setActiveTab(tab.dataset.homeTab);
      stopAutoPlay();
    });

    tab.addEventListener("pointerleave", () => {
      isHovering = false;
      scheduleAutoPlay(900);
    });

    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const currentIndex = capabilityOrder.indexOf(tab.dataset.homeTab);
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + direction + capabilityOrder.length) % capabilityOrder.length;
      const nextTab = document.querySelector(`[data-home-tab="${capabilityOrder[nextIndex]}"]`);
      setActiveTab(capabilityOrder[nextIndex]);
      nextTab?.focus();
      pauseAfterInteraction();
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoPlay();
    } else {
      scheduleAutoPlay();
    }
  });

  const capabilityObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) {
        scheduleAutoPlay();
      } else {
        stopAutoPlay();
      }
    },
    { threshold: 0.38 },
  );

  capabilityObserver.observe(capabilityConsole);
  setActiveTab(capabilityOrder[0]);
  window.setTimeout(scheduleAutoPlay, 250);
}

if (heroPanel && heroVisual) {
  heroPanel.addEventListener("pointermove", (event) => {
    const rect = heroPanel.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    heroVisual.style.transform = `translate3d(${x * 12}px, ${y * 10}px, 0)`;
  });

  heroPanel.addEventListener("pointerleave", () => {
    heroVisual.style.transform = "";
  });
}

/* =====================================================================
   2026-06-13 视觉升级脚本：照片兜底 · 对比滑块 · 滚动进场 · 数字滚动
   仅前端、纯增量；不触碰生成/工作台逻辑。
   ===================================================================== */
(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- 真实照片加载失败时回退到原 SVG（离线安全） ---- */
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
    "style-ref": "case-bottle-main",
    "style-result": "case-bottle-main",
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

  /* ---- 交互式 前后对比滑块 ---- */
  document.querySelectorAll("[data-ba-slider]").forEach((slider) => {
    const range = slider.querySelector(".ba-range");
    if (!range) {
      return;
    }
    const apply = (value) => slider.style.setProperty("--reveal", `${value}%`);
    apply(range.value);
    range.addEventListener("input", () => apply(range.value));
  });

  /* ---- 滚动进场（reduce-motion 时跳过，元素保持可见） ---- */
  if (!prefersReduced.matches && "IntersectionObserver" in window) {
    document
      .querySelectorAll(".workflow-line, .tech-core-grid, .why-grid, .case-grid")
      .forEach((group) => {
        Array.from(group.children).forEach((child, index) => {
          child.style.setProperty("--reveal-delay", `${index * 90}ms`);
        });
      });

    const revealTargets = document.querySelectorAll(
      [
        ".studio-section .section-heading",
        ".workflow-section .section-heading",
        ".tech-section .section-heading",
        ".why-section .section-heading",
        ".case-section .section-heading",
        ".faq-section .section-heading",
        ".workflow-line article",
        ".tech-core-grid article",
        ".why-grid article",
        ".case-card",
        ".faq-list details",
        ".scene-tags",
        ".tech-tags",
        ".capability-console",
        ".final-cta",
      ].join(", "),
    );

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );

    revealTargets.forEach((el) => {
      el.classList.add("reveal");
      revealObserver.observe(el);
    });
  }

  /* ---- 数字滚动计数（hero 已生成数量） ---- */
  document.querySelectorAll(".count-done").forEach((el) => {
    const target = parseInt(el.textContent.trim(), 10);
    if (!Number.isFinite(target) || prefersReduced.matches) {
      return;
    }
    const duration = 900;
    const start = performance.now();
    el.textContent = "0";
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });
})();
