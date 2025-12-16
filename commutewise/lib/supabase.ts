import { createClient } from '@supabase/supabase-js';

// SUPABASE CONFIGURATION
// USING PROVIDED CREDENTIALS - NORMALLY THESE SHOULD BE IN ENV VARIABLES
const SUPABASE_URL = 'https://ksmogligwazaczvstvbk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_o-29uOCvSsHA6XwGJhogtg_tyvtKvMw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);