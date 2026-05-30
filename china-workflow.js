const modeButtons = document.querySelectorAll("[data-mode]");
const title = document.querySelector(".generator-hero h1");
const subtitle = document.querySelector(".generator-hero p:not(.badge)");
const promptField = document.querySelector("#prompt-field");
const promptTextarea = promptField?.querySelector("textarea");
const uploadTitle = document.querySelector(".upload-card .card-title strong");
const uploadSubtitle = document.querySelector(".upload-card .card-title small");
const dropzoneTitle = document.querySelector(".dropzone strong");
const dropzoneSubtitle = document.querySelector(".dropzone small");
const actionButton = document.querySelector(".analyze-button");

const modeCopy = {
  main: {
    title: "生成电商主图",
    subtitle: "上传产品图，填写商品信息，快速生成适合国内电商平台上架使用的主图。",
    label: "主图要求",
    placeholder: "建议输入：产品名称、核心卖点、买家人群、上架平台、图片风格等",
    uploadTitle: "商品图",
    uploadSubtitle: "上传清晰的产品图片",
    dropzoneTitle: "上传正面、侧面、细节、SKU图或品牌素材",
    dropzoneSubtitle: "建议选择清晰、真实、角度完整的图片",
    action: "分析产品",
  },
  detail: {
    title: "生成详情页图组",
    subtitle: "根据商品卖点、参数、细节和SKU信息，生成结构清晰的详情页长图。",
    label: "详情页要求",
    placeholder: "建议输入：详情页结构、核心卖点、参数、材质、尺寸、包装和服务说明等",
    uploadTitle: "详情素材",
    uploadSubtitle: "上传产品细节和场景图片",
    dropzoneTitle: "上传细节图、场景图、包装图和参数图",
    dropzoneSubtitle: "素材越完整，详情页结构越清晰",
    action: "生成详情页",
  },
  sku: {
    title: "生成SKU图组",
    subtitle: "上传不同颜色、规格或款式图片，生成适合商品页浏览的SKU图和规格对比图。",
    label: "SKU要求",
    placeholder: "建议输入：SKU颜色、款式、规格、套餐组合、命名方式和对比重点等",
    uploadTitle: "SKU素材",
    uploadSubtitle: "上传不同规格和款式图片",
    dropzoneTitle: "上传颜色、款式、规格和套餐图片",
    dropzoneSubtitle: "建议每个SKU至少上传一张清晰图片",
    action: "生成SKU图",
  },
  logo: {
    title: "设计店铺Logo",
    subtitle: "输入店铺名、经营品类和品牌调性，生成适合店招、头像、包装贴纸和详情页使用的Logo方案。",
    label: "Logo要求",
    placeholder: "建议输入：店铺名、主营品类、目标客群、喜欢的风格、品牌关键词、希望避开的颜色或元素等",
    uploadTitle: "品牌素材",
    uploadSubtitle: "上传已有Logo、包装或风格参考",
    dropzoneTitle: "上传已有Logo、店铺截图、包装图或参考图",
    dropzoneSubtitle: "也可以不上传图片，填写店铺名和风格即可生成",
    action: "生成Logo方案",
  },
};

const applyMode = (button) => {
  modeButtons.forEach((item) => item.classList.toggle("active", item === button));
  const copy = modeCopy[button.dataset.mode] || modeCopy.main;
  title.textContent = copy.title;
  subtitle.textContent = copy.subtitle;
  if (promptField) promptField.childNodes[0].textContent = copy.label;
  if (promptTextarea) promptTextarea.placeholder = copy.placeholder;
  if (uploadTitle) uploadTitle.textContent = copy.uploadTitle;
  if (uploadSubtitle) uploadSubtitle.textContent = copy.uploadSubtitle;
  if (dropzoneTitle) dropzoneTitle.textContent = copy.dropzoneTitle;
  if (dropzoneSubtitle) dropzoneSubtitle.textContent = copy.dropzoneSubtitle;
  if (actionButton) {
    const icon = actionButton.querySelector("svg");
    actionButton.textContent = "";
    if (icon) actionButton.append(icon);
    actionButton.append(` ${copy.action}`);
  }
};

modeButtons.forEach((button) => {
  button.addEventListener("click", () => applyMode(button));
});

const initialMode = new URLSearchParams(window.location.search).get("mode");
const initialButton = Array.from(modeButtons).find((button) => button.dataset.mode === initialMode);
if (initialButton) applyMode(initialButton);
