const supabaseUrl = 'https://pnwmxmvvxexvyogfuhvd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBud214bXZ2eGV4dnlvZ2Z1aHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjIzNDYsImV4cCI6MjA5NDQzODM0Nn0.xKI-YKy8t7WnD6sApERsMKQLzV9KMJz7jsnAKw_TUIg'

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  })
  const spec = await res.json()
  console.log("Spec response:", JSON.stringify(spec, null, 2))
}

run()
