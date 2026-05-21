// scripts/update_xdrinks.js
import { supabase } from '../src/lib/supabase';

(async () => {
  const businessName = 'Xdrinks';
  // Find the business by name
  const { data: biz, error: findErr } = await supabase
    .from('businesses')
    .select('id, start_date')
    .eq('name', businessName)
    .single();

  if (findErr) {
    console.error('Error finding business:', findErr);
    process.exit(1);
  }

  // Set the start_date to 2026-04-18 (one month before current expiration)
  const newStartDate = '2026-04-18';
  const { error: updateErr } = await supabase
    .from('businesses')
    .update({ start_date: newStartDate })
    .eq('id', biz.id);

  if (updateErr) {
    console.error('Error updating business:', updateErr);
    process.exit(1);
  }

  console.log(`Business '${businessName}' updated: start_date set to ${newStartDate}`);
})();
