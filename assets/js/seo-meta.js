// NetBijak.com - SEO Meta / OG标签 / FAQ Schema 共用工具

function setSEOMeta({ title, description, url, image }) {
  if (title) document.title = title;
  const ensureMeta = (attr, key, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  const ogImage = image || "https://netbijak.com/assets/images/logo.png";

  ensureMeta("name", "description", description);
  ensureMeta("name", "geo.region", "MY");
  ensureMeta("name", "geo.placename", "Malaysia");
  ensureMeta("property", "og:title", title);
  ensureMeta("property", "og:description", description);
  ensureMeta("property", "og:type", "website");
  ensureMeta("property", "og:image", ogImage);
  if (url) ensureMeta("property", "og:url", url);
  ensureMeta("name", "twitter:card", "summary_large_image");
  ensureMeta("name", "twitter:title", title);
  ensureMeta("name", "twitter:description", description);
  ensureMeta("name", "twitter:image", ogImage);
}

function setGeoMeta(geoTag) {
  if (!geoTag) return;
  let el = document.querySelector('meta[name="geo.placename"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "geo.placename");
    document.head.appendChild(el);
  }
  el.setAttribute("content", geoTag);
}

// 读取页面上已经渲染好的 .faq-item，自动产生 FAQ Schema（内容一定跟画面上显示的一致）
function injectFAQSchema(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const items = container.querySelectorAll(".faq-item");
  if (!items.length) return;

  const mainEntity = [];
  items.forEach((item) => {
    const q = item.querySelector(".faq-question span");
    const a = item.querySelector(".faq-answer");
    if (q && a) {
      mainEntity.push({
        "@type": "Question",
        name: q.textContent.trim(),
        acceptedAnswer: {
          "@type": "Answer",
          text: a.textContent.trim().replace(/\s+/g, " "),
        },
      });
    }
  });
  if (mainEntity.length === 0) return;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: mainEntity,
  };

  const existing = document.getElementById("faq-schema-ld");
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "faq-schema-ld";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}