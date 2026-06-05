import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnwmxmvvxexvyogfuhvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud214bXZ2eGV4dnlvZ2Z1aHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjIzNDYsImV4cCI6MjA5NDQzODM0Nn0.xKI-YKy8t7WnD6sApERsMKQLzV9KMJz7jsnAKw_TUIg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log("Fetching support_tickets structure...")
  
  // Try to select a row to see what columns exist
  const { data: selectData, error: selectError } = await supabase
    .from('support_tickets')
    .select('*')
    .limit(1)
  
  console.log("Select Error:", selectError)
  console.log("Select Data:", selectData)

  // Try to insert a mock support ticket to see if it complains about schema or permissions
  const { data: insertData, error: insertError } = await supabase
    .from('support_tickets')
    .insert({
      business_id: '44bfa2be-a4fa-4d1a-8b89-a292d3257f86', // mock valid uuid
      business_name: 'Test Business',
      subject: 'Test Subject',
      message: 'Test message body'
    })
    .select()

  console.log("Insert Error:", insertError)
  console.log("Insert Data:", insertData)
}

run()
