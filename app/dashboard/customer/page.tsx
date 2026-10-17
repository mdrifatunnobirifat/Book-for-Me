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

function parseOrderNotes(raw: string | null) {
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (data.orderType === 'grocery_cart') return data
  } catch {}
  return null
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
    if (!window.confirm('Are you sure you want to cancel this order/booking?')) return
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
      {/* Nav */}
      <nav className="relative z-10 bg-white/85 backdrop-blur-md border-b border-sky-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="text-xl font-black text-sky-700">BookforMe</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/explore" className="btn-shimmer text-xs px-4 py-2.5 rounded-xl font-bold">
              🛍️ Explore Clinics & Stores
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
          <p className="text-slate-500 text-xs mt-1">
            Logged in as <span className="font-bold text-sky-600">{user?.full_name}</span> ({user?.email})
          </p>
        </div>

        {/* Bookings & Orders List */}
        <div className="glass rounded-3xl p-6 md:p-8 shadow-xl border border-sky-100 animate-fade-up">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-800">📦 My Orders & Appointments</h2>
              <p className="text-slate-400 text-xs mt-0.5">Track your grocery deliveries and medical visits</p>
            </div>

            <div className="flex gap-1.5">
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition capitalize ${
                    filter === f
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-sky-50/50 rounded-2xl border border-dashed border-sky-200">
              <p className="text-4xl mb-2">🛍️</p>
              <p className="text-slate-600 font-bold text-sm mb-2">No orders or appointments found.</p>
              <Link href="/explore" className="btn-shimmer text-xs px-4 py-2 rounded-xl font-bold inline-block">
                Browse Marketplace →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => {
                const orderData = parseOrderNotes(b.customer_notes)
                const isOrder = Boolean(orderData)
                const providerName = b.profiles?.business_name || b.profiles?.full_name || 'Business'

                const calUrl = buildGoogleCalendarUrl({
                  title: `${isOrder ? 'Grocery Delivery/Pickup' : b.services?.title} from ${providerName}`,
                  date: b.booking_date,
                  startTime: b.start_time.slice(0, 5),
                  endTime: b.end_time.slice(0, 5),
                  description: `BookforMe Order\nProvider: ${providerName}`,
                })

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-3xl p-5 border border-slate-100 hover:border-sky-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-lg">{isOrder ? '🛒' : '🏥'}</span>
                          <h3 className="text-slate-800 font-black text-base">
                            {isOrder ? `Grocery Order (${orderData.items?.length || 1} items)` : b.services?.title}
                          </h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-700">
                            {b.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sky-600 font-bold text-xs">🏪 {providerName}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400 text-xs">Total:</span>
                        <span className="text-emerald-600 font-black text-lg ml-1.5">
                          ${isOrder ? Number(orderData.totalAmount).toFixed(2) : Number(b.services?.price).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {isOrder ? (
                      <div className="bg-sky-50/50 p-3.5 rounded-2xl border border-sky-100 text-xs space-y-2 mb-3">
                        <p className="font-semibold text-slate-700">
                          📦 {orderData.fulfillment === 'delivery' ? `Home Delivery to: ${orderData.deliveryAddress}` : 'In-Store Pickup'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {orderData.items?.map((item: any, i: number) => (
                            <span key={i} className="bg-white px-2 py-0.5 rounded-lg border border-sky-100 text-slate-600">
                              {item.qty}x {item.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-sky-50/50 p-3 rounded-2xl border border-sky-100 text-xs flex gap-4 text-slate-600 mb-3">
                        <span>📅 {formatDate(b.booking_date)}</span>
                        <span>🕐 {formatTime(b.start_time)} – {formatTime(b.end_time)}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <a
                        href={calUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5"
                      >
                        <span>📆</span> Add to Google Calendar
                      </a>

                      {b.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="text-xs text-rose-600 border border-rose-200 hover:bg-rose-50 px-3.5 py-1.5 rounded-xl font-bold transition"
                        >
                          Cancel Order
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
