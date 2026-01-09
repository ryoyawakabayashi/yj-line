import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// サーバーサイドではservice roleキーを使用（RLSバイパス）
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey || config.supabase.anonKey
);
