'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  customer_notes: string | null
  services: { title: string; duration_minutes: number; price: number }
  profiles: { full_name: string; business_name: string | null }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function CustomerDashboard() {
  const [user, setUser] = useState<{ id: string; full_name: string } | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchBookings = async (userId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        id, booking_date, start_time, end_time, status, customer_notes,
        services (title, duration_minutes, price),
        profiles!bookings_provider_id_fkey (full_name, business_name)
      `)
      .eq('customer_id', userId)
      .order('booking_date', { ascending: false })

    setBookings((data as unknown as Booking[]) || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', authUser.id)
        .single()

      setUser({ id: authUser.id, full_name: profile?.full_name || 'User' })
      await fetchBookings(authUser.id)
      setLoading(false)
    }

    init()
    const timer = setTimeout(() => setShowToast(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleCancel = async (bookingId: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    if (user) fetchBookings(user.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const statusColor: Record<string, string> = {
    confirmed: 'bg-green-500/20 text-green-300 border-green-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
    completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">

      {/* Toast */}
      {showToast && user && (
        <div className="fixed top-5 right-5 z-50 animate-slide-in">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 min-w-[260px]">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Welcome back! 👋</p>
              <p className="text-purple-300 text-xs">{user.full_name}</p>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full ml-auto animate-pulse"></div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">👤 My Dashboard</h1>
            <p className="text-purple-300 mt-1">Welcome, <span className="font-semibold text-white">{user?.full_name}</span>!</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/explore"
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-xl transition"
            >
              + Book Service
            </Link>
            <button
              onClick={handleLogout}
              className="bg-white/10 hover:bg-red-500/30 text-white px-4 py-2 rounded-xl transition border border-white/20 text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total', value: bookings.length, color: 'text-white' },
            { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-green-300' },
            { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: 'text-red-300' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-white/50 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Bookings List */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          <h2 className="text-xl font-bold text-white mb-5">📅 My Appointments</h2>

          {bookings.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-white/60 mb-4">No appointments yet</p>
              <Link
                href="/explore"
                className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl transition text-sm"
              >
                Browse Providers
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold">{b.services?.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[b.status] || ''}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-white/50 text-sm">
                      {b.profiles?.business_name || b.profiles?.full_name}
                    </p>
                    <p className="text-purple-300 text-sm mt-1">
                      {formatDate(b.booking_date)} · {formatTime(b.start_time)}
                    </p>
                  </div>
                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => handleCancel(b.id)}
                      className="text-xs text-red-300 border border-red-500/30 hover:bg-red-500/20 px-4 py-1.5 rounded-lg transition flex-shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
