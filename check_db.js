import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('businesses').select('id, name, start_date, days_remaining, force_phase');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
