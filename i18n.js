// 全局三语字典 (ZH, EN, MS)
const translations = {
  zh: {
    nav_home: "首页",
    nav_providers: "宽带运营商",
    nav_speedtest: "网络测速",
    nav_blog: "网速指南",
    hero_title: "Netbijak.com — 寻找马来西亚最佳宽带配套",
    hero_subtitle: "明智比较 Unifi, TIME, Maxis 等多家宽带，获取独家优惠与回扣！",
    filter_housing_title: "选择住宅类型：",
    filter_all_housing: "全部住宅",
    filter_landed: "排屋 / 有地住宅 (Landed)",
    filter_highrise: "公寓 / 高楼住宅 (High-rise)",
    filter_app_title: "选择申请类型：",
    filter_all_app: "全部类型",
    filter_new: "新报装 (New)",
    filter_transfer: "转网/跳槽 (Transfer)",
    plans_title: "精选宽带配套比价",
    btn_apply: "立即申请 (WhatsApp)",
    btn_view_detail: "查看详情",
    mth: "月",
    contract: "合约",
    speed: "下载网速",
    upload_speed: "上传网速",
    features_title: "配套亮点与服务",
    recommended_title: "适用人群",
    back_to_list: "← 返回配套列表",
    footer_rights: "© 2026 Netbijak.com. 版权所有。"
  },
  en: {
    nav_home: "Home",
    nav_providers: "Providers",
    nav_speedtest: "Speedtest",
    nav_blog: "Blog",
    hero_title: "Netbijak.com — Find Best Broadband Deals in Malaysia",
    hero_subtitle: "Smartly compare Unifi, TIME, Maxis & more to get exclusive promos!",
    filter_housing_title: "Housing Type:",
    filter_all_housing: "All Housing Types",
    filter_landed: "Landed House",
    filter_highrise: "High-rise Building",
    filter_app_title: "Application Type:",
    filter_all_app: "All Types",
    filter_new: "New Application",
    filter_transfer: "Transfer to ISP",
    plans_title: "Featured Broadband Plans",
    btn_apply: "Apply Now (WhatsApp)",
    btn_view_detail: "View Details",
    mth: "mth",
    contract: "Contract",
    speed: "Download Speed",
    upload_speed: "Upload Speed",
    features_title: "Key Features & Benefits",
    recommended_title: "Recommended For",
    back_to_list: "← Back to Plans",
    footer_rights: "© 2026 Netbijak.com. All rights reserved."
  },
  ms: {
    nav_home: "Utama",
    nav_providers: "Penyedia",
    nav_speedtest: "Ujian Kelajuan",
    nav_blog: "Blog",
    hero_title: "Netbijak.com — Cari Pelan Jalur Lebar Terbaik di Malaysia",
    hero_subtitle: "Bandingkan Unifi, TIME, Maxis & lain-lain secara bijak untuk tawaran eksklusif!",
    filter_housing_title: "Jenis Kediaman:",
    filter_all_housing: "Semua Kediaman",
    filter_landed: "Kediaman Atas Tanah",
    filter_highrise: "Bangunan Tinggi",
    filter_app_title: "Jenis Permohonan:",
    filter_all_app: "Semua Jenis",
    filter_new: "Permohonan Baru",
    filter_transfer: "Tukar ke ISP",
    plans_title: "Pelan Jalur Lebar Pilihan",
    btn_apply: "Mohon Sekarang (WhatsApp)",
    btn_view_detail: "Lihat Butiran",
    mth: "bulan",
    contract: "Kontrak",
    speed: "Kelajuan Muat Turun",
    upload_speed: "Kelajuan Muat Naik",
    features_title: "Ciri-ciri Utama",
    recommended_title: "Sesuai Untuk",
    back_to_list: "← Kembali ke Senarai",
    footer_rights: "© 2026 Netbijak.com. Hak Cipta Terpelihara."
  }
};

let currentLang = localStorage.getItem('app_lang') || 'zh';

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('app_lang', lang);
  updatePageLanguage();
}

function updatePageLanguage() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang] && translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });

  const selector = document.getElementById('lang-selector');
  if (selector) selector.value = currentLang;
}

// 💡 智能单位解析：适配 100, 100Mbps, 1Gbps, 2Gbps 等文本类型
function formatSpeed(speedStr) {
  if (!speedStr) return { number: '-', unit: 'Mbps' };
  const raw = String(speedStr).trim();
  if (/gbps/i.test(raw)) {
    return { number: raw.replace(/gbps/i, '').trim(), unit: 'Gbps' };
  }
  return { number: raw.replace(/mbps/i, '').trim(), unit: 'Mbps' };
}

document.addEventListener('DOMContentLoaded', () => {
  updatePageLanguage();
});