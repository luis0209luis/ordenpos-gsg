// pages/api/forceXdrinks.js
import { supabase } from '../../src/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // Simple auth: require a secret query param (replace with your own secret)
  const secret = req.query.secret || '';
  if (secret !== process.env.FORCE_XDRINKS_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const businessName = 'Xdrinks';
  // Find the business
  const { data: biz, error: findErr } = await supabase
    .from('businesses')
    .select('id')
    .eq('name', businessName)
    .single();

  if (findErr) {
    console.error('Find error:', findErr);
    return res.status(500).json({ error: 'Business not found' });
  }

  const newStartDate = '2026-04-18'; // past date to force mora
  const { error: updateErr } = await supabase
    .from('businesses')
    .update({ start_date: newStartDate })
    .eq('id', biz.id);

  if (updateErr) {
    console.error('Update error:', updateErr);
    return res.status(500).json({ error: 'Failed to update' });
  }

  return res.status(200).json({ success: true, message: `Xdrinks start_date set to ${newStartDate}` });
}
