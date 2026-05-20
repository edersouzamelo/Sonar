import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials missing! process.env.NEXT_PUBLIC_SUPABASE_URL is:', supabaseUrl ? 'Set' : 'Empty');
} else {
    console.log('🔗 Supabase initializing... URL:', supabaseUrl.substring(0, 20), '| Key length:', supabaseAnonKey.length);
}

let client;
try {
    client = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
    console.error('❌ Critical error creating Supabase client:', e);
}

export const supabase = client!;
