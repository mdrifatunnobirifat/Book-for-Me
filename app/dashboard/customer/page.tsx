'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Booking {
  id: string; booking_date: string; start_time: string; end_time: string; status: string; customer_notes: string | null
  services: { title: string; duration_minutes: number; price: number }
  profiles: { full_name: string; business_name: string | null }
}

function formatDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
function formatTime(t: string) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }

const STATUS_CONFIG: Record<string, { badge: string; label: string; icon: string }> = {
  confirmed: { badge: 'badge-confirmed', label: 'Confirmed', icon: '✅' },
  pending:   { badge: 'badge-pending',   label: 'Pending',   icon: '⏳' },
  cancelled: { badge: 'badge-cancelled', label: 'Cancelled', icon: '❌' },
  completed: { badge: 'badge-completed', label: 'Completed', icon: '🏁' },
}

export default function CustomerDashboard() {
  const [user, setUser] = useState<{ id: string; full_name: string } | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(true)
  const [filter, setFilter] = useState('all')
  const router = useRouter()
  const supabase = createClient()

  const fetchBookings = async (userId: string) => {
    const { data } = await supabase.from('bookings')
      .select('id, booking_date, start_time, end_time, status, customer_notes, services(title, duration_minutes, price), profiles!bookings_provider_id_fkey(full_name, business_name)')
      .eq('customer_id', userId).order('booking_date', { ascending: false })
    setBookings((data as unknown as Booking[]) || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/auth/login'); return }
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', u.id).single()
      setUser({ id: u.id, full_name: p?.full_name || 'User' })
      await fetchBookings(u.id)
      setLoading(false)
    }
    init()
    const t = setTimeout(() => setShowToast(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    if (user) fetchBookings(user.id)
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  if (loading) return (
    <div className="sky-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-600 font-medium">Loading your dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="sky-bg min-h-screen">
      <div className="absolute top-0 right-0 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl" />

      {showToast && user && (
        <div className="fixed top-5 right-5 z-50 animate-bounce-in">
          <div className="glass rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3 min-w-[260px] border-l-4 border-sky-400">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-slate-800 font-semibold text-sm">Welcome back! 👋</p>
              <p className="text-sky-500 text-xs">{user.full_name}</p>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full ml-auto animate-pulse"></div>
          </div>
        </div>
      )}

      <nav className="relative z-10 bg-white/80 backdrop-blur-md border-b border-sky-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="text-xl font-black text-sky-700">BookIt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/explore" className="btn-shimmer text-sm px-4 py-2">+ Book Service</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
              className="text-slate-500 hover:text-red-500 text-sm font-medium transition px-3 py-2 rounded-lg hover:bg-red-50">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto p-6">
        <div className="animate-fade-up mb-8">
          <h1 className="text-3xl font-black text-slate-800">👤 My Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome, <span className="font-bold text-sky-600">{user?.full_name}</span>!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: bookings.length, color: 'from-sky-400 to-blue-500' },
            { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'from-green-400 to-emerald-500' },
            { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: 'from-yellow-400 to-amber-500' },
            { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: 'from-blue-400 to-indigo-500' },
          ].map((s, i) => (
            <div key={s.label} className={`glass rounded-2xl p-5 text-center animate-fade-up delay-${(i+1)*100}`}>
              <p className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bookings */}
        <div className="glass rounded-2xl p-6 animate-fade-up delay-200">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-slate-800">📅 My Appointments</h2>
            <div className="flex gap-2 flex-wrap">
              {['all','pending','confirmed','cancelled'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition capitalize ${
                    filter === f ? 'bg-sky-500 text-white shadow-md shadow-sky-200' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                  }`}>{f}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-5xl mb-3">📭</p>
              <p className="text-slate-400 mb-4 text-sm">No appointments found</p>
              <Link href="/explore" className="btn-shimmer inline-block px-6 py-2.5 text-sm rounded-xl">Browse Providers</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((b, i) => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
                return (
                  <div key={b.id} className={`bg-white rounded-xl p-4 border border-slate-100 hover:border-sky-200 hover:shadow-md transition-all duration-200 animate-fade-up delay-${(i % 4 + 1) * 100}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-slate-800 font-bold">{b.services?.title}</p>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm">{b.profiles?.business_name || b.profiles?.full_name}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="text-slate-400">📅 {formatDate(b.booking_date)}</span>
                          <span className="text-sky-500 font-semibold">🕐 {formatTime(b.start_time)}</span>
                          <span className="text-slate-400">${Number(b.services?.price).toFixed(2)}</span>
                        </div>
                      </div>
                      {(b.status === 'pending' || b.status === 'confirmed') && (
                        <button onClick={() => handleCancel(b.id)}
                          className="text-xs text-red-400 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition flex-shrink-0 font-medium">
                          Cancel
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
