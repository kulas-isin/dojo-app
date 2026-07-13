import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 專案設定。publishable key 是「可公開金鑰」，放前端安全（靠資料庫 RLS 保護）。
export const SUPABASE_URL = 'https://kobqhuocvhfugenlyvli.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_VPhCGRz7XNq4yd4RfmCbmQ_I7Bc0lZ7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
