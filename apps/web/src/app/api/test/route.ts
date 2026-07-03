import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getSession()
    return Response.json({ data, error, env: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing'
    }})
  } catch (err) {
    return Response.json({ err: String(err) })
  }
}