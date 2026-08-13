// NetBijak.com - 三语言文字对照表
const translations = {
  en: {
    nav_home: "Home",
    nav_speedtest: "Speed Test",
    nav_blog: "Blog",
    site_name: "NetBijak",
    footer_text: "Compare Malaysia's best broadband plans.",
    footer_rights: "All rights reserved.",
  },
  zh: {
    nav_home: "首页",
    nav_speedtest: "测速",
    nav_blog: "部落格",
    site_name: "NetBijak",
    footer_text: "比较马来西亚最优质的宽频配套。",
    footer_rights: "版权所有。",
  },
  ms: {
    nav_home: "Laman Utama",
    nav_speedtest: "Ujian Kelajuan",
    nav_blog: "Blog",
    site_name: "NetBijak",
    footer_text: "Bandingkan pelan jalur lebar terbaik di Malaysia.",
    footer_rights: "Hak cipta terpelihara.",
  },
};

function getCurrentLang() {
  const path = window.location.pathname;
  if (path.startsWith("/zh/")) return "zh";
  if (path.startsWith("/ms/")) return "ms";
  return "en";
}

function t(key) {
  const lang = getCurrentLang();
  return translations[lang][key] || key;
}