import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Use service role key if available, otherwise anon key
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Delete associated bookings
    await supabase.from('bookings').delete().or(`provider_id.eq.${userId},customer_id.eq.${userId}`)

    // 2. Delete provider services
    await supabase.from('services').delete().eq('provider_id', userId)

    // 3. Delete provider working hours
    await supabase.from('working_hours').delete().eq('provider_id', userId)

    // 4. Delete provider blocked dates
    await supabase.from('blocked_dates').delete().eq('provider_id', userId)

    // 5. Delete profile record
    const { data: deleted, error: profErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
      .select()

    if (profErr) {
      throw profErr
    }

    // If RLS blocked the delete, inform the caller clearly
    if (!deleted || deleted.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Database permission denied: Supabase Row Level Security (RLS) blocked deleting this profile. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local or add a DELETE policy in Supabase SQL editor.'
      }, { status: 403 })
    }

    // 6. Delete auth user if service role key is available
    if (hasServiceKey) {
      try {
        await supabase.auth.admin.deleteUser(userId)
      } catch (authErr) {
        console.error('Auth user delete error:', authErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete account'
    console.error('Delete error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
