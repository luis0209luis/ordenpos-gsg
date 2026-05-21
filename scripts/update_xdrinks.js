// scripts/update_xdrinks.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  // Debug: list first 20 businesses
  const { data: allBiz, error: listErr } = await supabase.from('businesses').select('id,name,start_date').limit(20);
  console.log('All businesses (first 20):', allBiz);
  if (listErr) {
    console.error('List error:', listErr);
    process.exit(1);
  }
  const businessName = 'Xdrinks';
  const { data: biz, error: findErr } = await supabase
    .from('businesses')
    .select('id')
    .ilike('name', `%${businessName}%`)
    .single();

  if (findErr) {
    console.error('Error finding business:', findErr);
    process.exit(1);
  }

  const newStartDate = '2026-04-18';
  const diffMs = new Date(newStartDate) - new Date();
  const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const { error: updateErr } = await supabase
    .from('businesses')
    .update({ start_date: newStartDate, days_remaining: daysDiff })
    .eq('id', biz.id);

  if (updateErr) {
    console.error('Error updating business:', updateErr);
    process.exit(1);
  }

  console.log(`Business '${businessName}' updated: start_date=${newStartDate}, days_remaining=${daysDiff}`);
})();
