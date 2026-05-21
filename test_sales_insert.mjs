import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnwmxmvvxexvyogfuhvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud214bXZ2eGV4dnlvZ2Z1aHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjIzNDYsImV4cCI6MjA5NDQzODM0Nn0.xKI-YKy8t7WnD6sApERsMKQLzV9KMJz7jsnAKw_TUIg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data: bData } = await supabase.from('businesses').select('id').limit(1)
  const bid = bData[0].id

  const saleRecord = {
    business_id: bid,
    // created_at is omitted to let Supabase use the DEFAULT now()
    items: [{ id: '1', name: 'Test Product', quantity: 2, price: 50 }],
    total: 100,
    is_delivery: false,
    delivery_data: null,
    kitchen_status: 'pending',
    delivery_status: 'Pendiente'
  }
  
  const { data, error } = await supabase.from('sales').insert(saleRecord).select()
  console.log("Insert result data:", data)
  console.log("Insert result error:", error)
}

run()
