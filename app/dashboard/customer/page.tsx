'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { buildGoogleCalendarUrl } from '@/lib/calendar'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  customer_notes: string | null
  services: { title: string; duration_minutes: number; price: number }
  profiles: { full_name: string; business_name: string | null; avatar_url?: string | null }
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: string }> = {
  confirmed: { label: 'Confirmed', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: '✅' },
  pending:   { label: 'Waiting Approval', badge: 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse', icon: '⏳' },
  cancelled: { label: 'Cancelled', badge: 'bg-rose-100 text-rose-700 border-rose-300', icon: '❌' },
  completed: { label: 'Completed', badge: 'bg-sky-100 text-sky-700 border-sky-300', icon: '🏁' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(time: string) {
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; full_name: string; email: string } | null>(null)
  const [filter, setFilter] = useState('all')
  const [showToast, setShowToast] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchBookings = async (userId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, status, customer_notes, services(title, duration_minutes, price), profiles!bookings_provider_id_fkey(full_name, business_name, avatar_url)')
      .eq('customer_id', userId)
      .order('booking_date', { ascending: false })
    setBookings((data as unknown as Booking[]) || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        router.push('/auth/login')
        return
      }
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', u.id).single()
      setUser({ id: u.id, full_name: p?.full_name || 'Customer', email: u.email || '' })
      await fetchBookings(u.id)
      setLoading(false)
    }
    init()
    const t = setTimeout(() => setShowToast(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    if (user) fetchBookings(user.id)
  }

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

  if (loading) {
    return (
      <div className="sky-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sky-600 font-bold">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="sky-bg min-h-screen">
      <div className="absolute top-0 right-0 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />

      {showToast && user && (
        <div className="fixed top-5 right-5 z-50 animate-bounce-in">
          <div className="glass rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 min-w-[260px] border-l-4 border-sky-400">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-slate-800 font-semibold text-sm">Welcome back! 👋</p>
              <p className="text-sky-600 text-xs font-semibold">{user.full_name}</p>
            </div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full ml-auto animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-md border-b border-sky-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="text-xl font-black text-sky-700">BookIt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/explore" className="btn-shimmer text-xs px-4 py-2.5 rounded-xl font-bold">
              🛍️ Explore & Book Shops
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/auth/login')
              }}
              className="text-slate-500 hover:text-rose-600 text-xs font-bold transition px-3 py-2 rounded-lg hover:bg-rose-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto p-6">
        <div className="animate-fade-up mb-6">
          <h1 className="text-3xl font-black text-slate-800">👤 Customer Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Logged in as <span className="font-bold text-sky-600">{user?.full_name}</span> ({user?.email})
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          {[
            { label: 'Total Appointments', value: bookings.length, color: 'from-sky-400 to-blue-500', icon: '📅' },
            { label: 'Confirmed',          value: bookings.filter((b) => b.status === 'confirmed').length, color: 'from-emerald-400 to-green-500', icon: '✅' },
            { label: 'Pending',            value: bookings.filter((b) => b.status === 'pending').length, color: 'from-amber-400 to-yellow-500', icon: '⏳' },
            { label: 'Completed',          value: bookings.filter((b) => b.status === 'completed').length, color: 'from-blue-400 to-indigo-500', icon: '🏁' },
          ].map((s, i) => (
            <div key={s.label} className={`glass rounded-2xl p-4 text-center animate-fade-up delay-${(i + 1) * 100}`}>
              <span className="text-xl mb-1 block">{s.icon}</span>
              <p className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.color}`}>
                {s.value}
              </p>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bookings List */}
        <div className="glass rounded-2xl p-6 shadow-xl border border-sky-100 animate-fade-up delay-200">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-800">📅 My Booked Appointments</h2>
              <p className="text-slate-400 text-xs mt-0.5">Track your orders and sync them with Google Calendar</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['all', 'pending', 'confirmed', 'cancelled'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition capitalize ${
                    filter === f
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-14 bg-sky-50/50 rounded-2xl border border-dashed border-sky-200">
              <p className="text-4xl mb-2">🛍️</p>
              <p className="text-slate-500 text-sm font-semibold mb-3">No appointments found.</p>
              <Link href="/explore" className="btn-shimmer text-xs px-5 py-2.5 rounded-xl font-bold inline-block">
                Browse Shops & Book →
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filtered.map((b) => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
                const providerName = b.profiles?.business_name || b.profiles?.full_name || 'Provider'
                const calUrl = buildGoogleCalendarUrl({
                  title: `${b.services?.title} with ${providerName}`,
                  date: b.booking_date,
                  startTime: b.start_time.slice(0, 5),
                  endTime: b.end_time.slice(0, 5),
                  description: `Booked via BookIt platform\nProvider: ${providerName}`,
                })

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-sky-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-slate-800 font-extrabold text-base">{b.services?.title}</h3>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${cfg.badge}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        <p className="text-sky-600 font-bold text-xs">🏪 {providerName}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400 text-xs">Price:</span>
                        <span className="text-emerald-600 font-black text-base ml-1.5">
                          ${Number(b.services?.price).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs bg-sky-50/50 p-3 rounded-xl border border-sky-100 mb-3">
                      <span className="text-slate-700 font-bold">📅 {formatDate(b.booking_date)}</span>
                      <span className="text-sky-600 font-bold">
                        🕐 {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </span>
                      <span className="text-slate-500 font-medium">⏱ {b.services?.duration_minutes} mins</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <a
                        href={calUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>📆</span> Add to Google Calendar
                      </a>

                      {(b.status === 'pending' || b.status === 'confirmed') && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="text-xs text-rose-600 border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-bold transition"
                        >
                          Cancel Appointment
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
