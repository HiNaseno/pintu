const platformCopy = {
  taobao: {
    label: "淘宝标准包",
    button: "生成淘宝套图",
    title: "主图 1 / 5 · 点击主图",
    export: ["800 × 800", "750宽", "3张内"],
  },
  alibaba: {
    label: "1688采购包",
    button: "生成1688套图",
    title: "主图 1 / 5 · 产品总览图",
    export: ["800 × 800", "790宽", "3张内"],
  },
};

const platformButtons = document.querySelectorAll("[data-platform]");
const platformLabel = document.querySelector(".platform-label");
const generateButton = document.querySelector(".generate-button");
const previewTitle = document.querySelector(".preview-title");
const exportStrong = document.querySelectorAll(".export-item strong");
const thumbButtons = document.querySelectorAll(".thumb");
const modeButtons = document.querySelectorAll(".mode-card");
const swatches = document.querySelectorAll(".swatch");

platformButtons.forEach((button) => {
  button.addEventListener("click", () => {
    platformButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    const copy = platformCopy[button.dataset.platform];
    platformLabel.textContent = copy.label;
    generateButton.lastChild.textContent = copy.button;
    previewTitle.textContent = copy.title;
    exportStrong.forEach((item, index) => {
      item.textContent = copy.export[index];
    });
  });
});

thumbButtons.forEach((button) => {
  button.addEventListener("click", () => {
    thumbButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    previewTitle.textContent = button.dataset.title;
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    modeButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});

swatches.forEach((button) => {
  button.addEventListener("click", () => {
    swatches.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
  });
});
