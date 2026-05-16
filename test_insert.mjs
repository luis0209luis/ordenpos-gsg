import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnwmxmvvxexvyogfuhvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud214bXZ2eGV4dnlvZ2Z1aHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjIzNDYsImV4cCI6MjA5NDQzODM0Nn0.xKI-YKy8t7WnD6sApERsMKQLzV9KMJz7jsnAKw_TUIg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  const dbProduct = {
    nombre: 'Test',
    precio: 100,
    categoria: 'Test',
    stock_actual: 10,
    stock_minimo: 5
  }
  const { data, error } = await supabase.from('products').insert({ ...dbProduct, business_id: '123e4567-e89b-12d3-a456-426614174000' }).select().single()
  console.log("PRODUCTS ERROR:", JSON.stringify(error, null, 2))
}

test()
