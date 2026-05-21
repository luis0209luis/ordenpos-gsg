import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnwmxmvvxexvyogfuhvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud214bXZ2eGV4dnlvZ2Z1aHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjIzNDYsImV4cCI6MjA5NDQzODM0Nn0.xKI-YKy8t7WnD6sApERsMKQLzV9KMJz7jsnAKw_TUIg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.from('staff').select('id').limit(1)
  console.log("data:", data, "error:", error)

  const { data: cols, error: err } = await supabase.rpc('get_columns', { table_name: 'staff' })
  if (err) {
    // If get_columns RPC doesn't exist, we can use standard sql-like querying or try to insert with some fields to see error.
    console.error("RPC error:", err)
    
    // Let's try inserting with a name to see the next error!
    const { data: instData, error: instErr } = await supabase.from('staff').insert({ name: 'Test', username: 'testuser_unique', password: 'password123', role: 'CAJERO' }).select()
    console.log("Insert response with name and username - error:", instErr)
    console.log("Insert response with name and username - data:", instData)
  } else {
    console.log("Cols:", cols)
  }
}

test()
