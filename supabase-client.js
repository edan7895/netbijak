// NetBijak.com - Supabase 连接设定
const SUPABASE_URL = "https://yslzoodokunufsgeoazk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbHpvb2Rva3VudWZzZ2VvYXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODgwMTcsImV4cCI6MjEwMjA2NDAxN30.LFQ8KoSfw_2kCDcoYgfLTrmFebEniQ1O5oUS1r2v-lg";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);