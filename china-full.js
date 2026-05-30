const homeTabs = document.querySelectorAll("[data-home-tab]");
const homePanels = document.querySelectorAll("[data-home-panel]");
const heroPanel = document.querySelector(".hero-panel");
const heroVisual = document.querySelector(".hero-visual");

const setActiveTab = (target) => {
  homeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.homeTab === target);
  });

  homePanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.homePanel === target);
  });
};

homeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.homeTab));
});

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
