import { supabase } from '../lib/supabase'
import { isValidUUID } from './uuid'

export async function insertLog({ type, action, business_id, username, message }) {
  try {
    const finalBusinessId = isValidUUID(business_id) ? business_id : null
    await supabase.from('system_logs').insert({ type, action, business_id: finalBusinessId, username, message })
  } catch (e) {
    console.error('Error inserting log:', e)
  }
}
