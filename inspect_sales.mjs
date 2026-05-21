import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnwmxmvvxexvyogfuhvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud214bXZ2eGV4dnlvZ2Z1aHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjIzNDYsImV4cCI6MjA5NDQzODM0Nn0.xKI-YKy8t7WnD6sApERsMKQLzV9KMJz7jsnAKw_TUIg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data, error } = await supabase.from('sales').select('*').limit(1)
  if (error) {
    console.error("Error fetching sales:", error)
  } else {
    console.log("Sales data:", data)
    if (data && data.length > 0) {
      console.log("Sales columns:", Object.keys(data[0]))
    } else {
      console.log("Sales table is empty.")
      // Let's try to query table info via PostgREST OpenAPI spec or a dummy insert that fails to see the DB error/columns
      const { data: apiData, error: apiError } = await supabase.from('sales').insert({}).select()
      console.log("Dummy insert result:", apiData, "error:", apiError)
    }
  }
}

test()
