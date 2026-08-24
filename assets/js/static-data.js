// NetBijak.com - 静态资料读取工具（取代直接问Supabase）

const _staticDataCache = {};

async function fetchStaticData(name) {
  if (_staticDataCache[name]) return _staticDataCache[name];

  const root = typeof ROOT_PATH !== "undefined" ? ROOT_PATH : "../";
  const url = `${root}data/${name}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${name}.json: ${res.status}`);
    const data = await res.json();
    _staticDataCache[name] = data;
    return data;
  } catch (err) {
    console.error(`Error loading static data (${name}):`, err);
    return [];
  }
}

// 判断一个配套现在是否应该显示（依照 publish_at / unpublish_at 时间比对）
function isPlanCurrentlyPublished(plan) {
  const now = new Date();
  if (plan.publish_at && new Date(plan.publish_at) > now) return false;
  if (plan.unpublish_at && new Date(plan.unpublish_at) < now) return false;
  return true;
}

// 判断一篇文章现在是否应该显示
function isArticleCurrentlyPublished(article) {
  const now = new Date();
  if (article.publish_at && new Date(article.publish_at) > now) return false;
  return true;
}