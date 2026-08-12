// Supabase 项目配置
const SUPABASE_URL = "https://yslzoodokunufsgeoazk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbHpvb2Rva3VudWZzZ2VvYXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODgwMTcsImV4cCI6MjEwMjA2NDAxN30.LFQ8KoSfw_2kCDcoYgfLTrmFebEniQ1O5oUS1r2v-lg";

// 全局 Supabase 客户端变量
var supabaseClient = null;

function initSupabase() {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Netbijak.com: Supabase 数据库连接成功！");
  } else {
    console.error("❌ Supabase SDK 加载失败，请检查网络！");
  }
}