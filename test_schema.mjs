import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnwmxmvvxexvyogfuhvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud214bXZ2eGV4dnlvZ2Z1aHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjIzNDYsImV4cCI6MjA5NDQzODM0Nn0.xKI-YKy8t7WnD6sApERsMKQLzV9KMJz7jsnAKw_TUIg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const { data: pData } = await supabase.from('products').select('*').limit(1)
  console.log("PRODUCTS COLUMNS:", pData && pData.length > 0 ? Object.keys(pData[0]) : "No data")

  const { data: bData } = await supabase.from('businesses').select('*').limit(1)
  console.log("BUSINESSES COLUMNS:", bData && bData.length > 0 ? Object.keys(bData[0]) : "No data")
}

test()
