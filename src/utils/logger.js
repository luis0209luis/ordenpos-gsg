import { supabase } from '../lib/supabase'

export async function insertLog({ type, action, business_id, username, message }) {
  try {
    await supabase.from('system_logs').insert({ type, action, business_id, username, message })
  } catch (e) {
    console.error('Error inserting log:', e)
  }
}
