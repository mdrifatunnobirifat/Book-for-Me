'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { buildGoogleCalendarUrl, buildICSContent } from '@/lib/calendar'

interface Provider {
  id: string; full_name: string; business_name: string | null
  bio: string | null; avatar_url: string | null
  phone: string | null; location: string | null; category: string | null
}
interface Service { id: string; title: string; duration_minutes: number; price: number; description: string | null }
interface WorkingHour { day_of_week: number; start_time: string; end_time: string; is_day_off: boolean }
interface Booking { booking_date: string; start_time: string; end_time: string; status: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CATEGORY_ICONS: Record<string, string> = {
  'Barbershop & Hair': '✂️', 'Beauty & Spa': '💆', 'Fitness & Gym': '🏋️',
  'Medical & Health': '🏥', 'Legal & Consulting': '⚖️', 'Home Services': '🔧',
  'Photography': '📷', 'Education & Tutoring': '📚', 'Automotive': '🚗',
  'Pet Care': '🐾', 'Food & Catering': '🍽️', 'Other': '🌟',
}

function timeToMins(t: string) { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m }
function minsToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
function formatDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }
function formatTime(t: string) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
function today() { return new Date().toISOString().split('T')[0] }

function generateSlots(start: string, end: string, dur: number, bookings: Booking[], date: string) {
  const slots: string[] = []
  let cur = timeToMins(start)
  const endM = timeToMins(end)
  while (cur + dur <= endM) {
    const s = minsToTime(cur), e = minsToTime(cur + dur)
    const blocked = bookings.some(b =>
      b.booking_date === date && b.status !== 'cancelled' &&
      timeToMins(b.start_time) < timeToMins(e) && timeToMins(b.end_time) > timeToMins(s)
    )
    if (!blocked) slots.push(s)
    cur += dur
  }
  return slots
}

function downloadICS(data: { id: string; date: string; start: string; end: string; service: string; provider: string }) {
  const ics = buildICSContent({
    uid: data.id, title: `${data.service} with ${data.provider}`,
    date: data.date, startTime: data.start, endTime: data.end,
    description: `Booked via BookforMe\nProvider: ${data.provider}`,
    organizer: data.provider,
  })
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `bookforme.ics`; a.click()
  URL.revokeObjectURL(url)
}

async function sendEmail(customerEmail: string, customerName: string, providerName: string, serviceName: string, bookingDate: string, startTime: string, endTime: string) {
  try {
    const fmt = (t: string) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
    const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(serviceName + ' with ' + providerName)}&dates=${bookingDate.replace(/-/g,'')}T${startTime.replace(':','')}00/${bookingDate.replace(/-/g,'')}T${endTime.replace(':','')}00`

    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customerEmail,
        subject: `⏳ Booking Received: ${serviceName} with ${providerName}`,
        html: `
          <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(14,165,233,0.12);font-family:Inter,Arial,sans-serif;">
            <div style="background:linear-gradient(135deg,#0ea5e9,#2563eb);padding:28px;text-align:center;">
              <div style="font-size:36px;">📅</div>
              <div style="font-size:24px;font-weight:900;color:#fff;">BookforMe</div>
            </div>
            <div style="background:#fef9c320;border-left:4px solid #f59e0b;padding:14px 24px;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#334155;">⏳ Booking Request Received!</p>
              <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Waiting for provider confirmation.</p>
            </div>
            <div style="padding:24px;">
              <p style="color:#64748b;font-size:14px;">Hi <strong>${customerName}</strong>, your request has been sent!</p>
              <div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid #e2e8f0;margin:16px 0;">
                ${[['🏪 Provider', providerName],['🛠 Service', serviceName],['📅 Date', fmtDate(bookingDate)],['🕐 Time', fmt(startTime)+' → '+fmt(endTime)]].map(([k,v]) => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#94a3b8;font-size:13px;">${k}</span><span style="color:#334155;font-size:13px;font-weight:600;">${v}</span></div>`).join('')}
              </div>
              <div style="text-align:center;margin:20px 0;">
                <a href="${calUrl}" style="background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;font-size:14px;display:inline-block;">📆 Add to Google Calendar</a>
              </div>
            </div>
          </div>`,
      }),
    })
  } catch { /* email is non-critical */ }
}

export default function ShopPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const supabase = createClient()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [showBookingPanel, setShowBookingPanel] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')
  const [success, setSuccess] = useState(false)
  const [bookingId, setBookingId] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        setCurrentUser({ id: user.id, email: user.email || '', name: p?.full_name || 'Customer' })
      }
      const { data: prov } = await supabase.from('profiles')
        .select('id,full_name,business_name,bio,avatar_url,phone,location,category')
        .or(`slug.eq.${slug},id.eq.${slug}`).eq('role', 'provider').single()
      if (!prov) { setLoading(false); return }
      setProvider(prov)
      const [{ data: svc }, { data: wh }, { data: bd }] = await Promise.all([
        supabase.from('services').select('*').eq('provider_id', prov.id).eq('is_active', true),
        supabase.from('working_hours').select('*').eq('provider_id', prov.id),
        supabase.from('blocked_dates').select('blocked_date').eq('provider_id', prov.id),
      ])
      setServices(svc || [])
      setWorkingHours(wh || [])
      setBlockedDates((bd || []).map((b: { blocked_date: string }) => b.blocked_date))
      setLoading(false)
    }
    init()
  }, [slug])

  useEffect(() => {
    if (!selectedDate || !selectedService || !provider) { setAvailableSlots([]); setSelectedSlot(''); return }
    const check = async () => {
      setSlotsLoading(true); setSelectedSlot(''); setDateError('')
      const { data: fresh } = await supabase.from('bookings')
        .select('booking_date,start_time,end_time,status')
        .eq('provider_id', provider.id).eq('booking_date', selectedDate).neq('status', 'cancelled')
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()
      if (blockedDates.includes(selectedDate)) { setDateError('This date is blocked.'); setAvailableSlots([]); setSlotsLoading(false); return }
      const sched = workingHours.find(wh => wh.day_of_week === dayOfWeek)
      if (!sched || sched.is_day_off) { setDateError('Provider not available this day.'); setAvailableSlots([]); setSlotsLoading(false); return }
      setAvailableSlots(generateSlots(sched.start_time.slice(0, 5), sched.end_time.slice(0, 5), selectedService.duration_minutes, fresh || [], selectedDate))
      setSlotsLoading(false)
    }
    check()
  }, [selectedDate, selectedService])

  const openService = (svc: Service) => {
    setSelectedService(svc); setShowBookingPanel(true)
    setSelectedDate(''); setSelectedSlot(''); setAvailableSlots([]); setError(''); setDateError('')
  }

  const handleBook = async () => {
    if (!currentUser) { router.push('/auth/login'); return }
    if (!selectedService || !selectedDate || !selectedSlot || !provider) return
    setBooking(true); setError('')
    const endTime = minsToTime(timeToMins(selectedSlot) + selectedService.duration_minutes)
    const { data: clash } = await supabase.from('bookings').select('id')
      .eq('provider_id', provider.id).eq('booking_date', selectedDate)
      .neq('status', 'cancelled').lt('start_time', endTime).gt('end_time', selectedSlot)
    if (clash && clash.length > 0) { setError('Slot just taken. Try another.'); setSelectedSlot(''); setBooking(false); return }
    const { data: nb, error: err } = await supabase.from('bookings').insert({
      provider_id: provider.id, customer_id: currentUser.id, service_id: selectedService.id,
      booking_date: selectedDate, start_time: selectedSlot, end_time: endTime,
      status: 'pending', customer_notes: notes || null,
    }).select('id').single()
    if (err) { setError(err.message); setBooking(false); return }
    setBookingId(nb?.id || '')
    // ── Send email notification (non-blocking) ──
    if (currentUser.email) {
      sendEmail(currentUser.email, currentUser.name, provider.business_name || provider.full_name, selectedService.title, selectedDate, selectedSlot, endTime)
    }
    setSuccess(true)
    setShowBookingPanel(false)
  }

  if (loading) return (
    <div className="sky-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-600 font-medium">Loading shop...</p>
      </div>
    </div>
  )

  if (!provider) return (
    <div className="sky-bg min-h-screen flex items-center justify-center">
      <div className="glass rounded-2xl p-10 text-center animate-bounce-in">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Shop Not Found</h1>
        <Link href="/explore" className="btn-shimmer inline-block mt-4 px-6 py-3 text-sm">Browse Shops</Link>
      </div>
    </div>
  )

  if (success && selectedService) {
    const endTime = minsToTime(timeToMins(selectedSlot) + selectedService.duration_minutes)
    const calUrl = buildGoogleCalendarUrl({
      title: `${selectedService.title} with ${provider.business_name || provider.full_name}`,
      date: selectedDate, startTime: selectedSlot, endTime,
      description: `Booked via BookforMe`,
    })
    return (
      <div className="sky-bg min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center animate-bounce-in">
          <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 animate-float shadow-lg shadow-sky-200">🎉</div>
          <h1 className="text-3xl font-black text-slate-800 mb-1">Booking Sent!</h1>
          <p className="text-slate-400 text-sm mb-5">
            {currentUser?.email
              ? <>Check <span className="text-sky-500 font-semibold">{currentUser.email}</span> — we sent a confirmation email!</>
              : 'Waiting for provider confirmation.'}
          </p>
          <div className="bg-sky-50 rounded-xl p-4 text-left space-y-2.5 border border-sky-100 mb-5">
            {[
              ['🏪 Shop', provider.business_name || provider.full_name],
              ['🛠 Service', selectedService.title],
              ['📅 Date', formatDate(selectedDate)],
              ['🕐 Time', `${formatTime(selectedSlot)} → ${formatTime(endTime)}`],
              ['💰 Price', `$${Number(selectedService.price).toFixed(2)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-400 text-xs">{k}</span>
                <span className="text-slate-800 text-sm font-semibold">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <a href={calUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-xl transition text-sm">
              📆 Add to Google Calendar
            </a>
            <button onClick={() => downloadICS({ id: bookingId, date: selectedDate, start: selectedSlot, end: endTime, service: selectedService.title, provider: provider.business_name || provider.full_name })}
              className="text-sm text-slate-500 border border-slate-200 py-2.5 px-4 rounded-xl hover:bg-slate-50 transition">
              ⬇️ Download .ics
            </button>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/customer" className="flex-1 btn-shimmer text-center py-3 text-sm block">My Bookings</Link>
            <Link href="/explore" className="flex-1 bg-white hover:bg-sky-50 text-sky-600 font-semibold border-2 border-sky-200 py-3 text-sm rounded-xl transition text-center">More Shops</Link>
          </div>
        </div>
      </div>
    )
  }

  const icon = CATEGORY_ICONS[provider.category || ''] || '🌟'
  const openDays = workingHours.filter(w => !w.is_day_off)

  return (
    <div className="sky-bg min-h-screen">
      {/* Floating Booking Panel */}
      {showBookingPanel && selectedService && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setShowBookingPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col animate-slide-in overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-5 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setShowBookingPanel(false)}
                  className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition text-lg">✕</button>
                <span className="text-white/80 text-sm font-medium">Book Appointment</span>
                <div className="w-9" />
              </div>
              <p className="text-white/70 text-xs uppercase tracking-wide mb-0.5">Selected Service</p>
              <p className="text-white font-black text-xl">{selectedService.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full">⏱ {selectedService.duration_minutes} mins</span>
                <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-semibold">💰 ${Number(selectedService.price).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <label className="block text-slate-700 font-bold text-sm mb-2">📅 Select Date</label>
                <input type="date" min={today()} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="sky-input" />
                {dateError && <p className="text-red-500 text-xs mt-2 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">❌ {dateError}</p>}
                {selectedDate && !dateError && <p className="text-sky-500 text-xs mt-2 font-medium">📅 {formatDate(selectedDate)}</p>}
              </div>

              {selectedDate && !dateError && (
                <div>
                  <label className="block text-slate-700 font-bold text-sm mb-2">🕐 Available Slots</label>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                      <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                      Checking...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm">No slots available. Try another date.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map(slot => {
                        const endSlot = minsToTime(timeToMins(slot) + selectedService.duration_minutes)
                        const isSel = selectedSlot === slot
                        return (
                          <button key={slot} onClick={() => setSelectedSlot(slot)}
                            className={`flex flex-col items-center py-3 rounded-xl border-2 text-xs font-semibold transition-all duration-200 ${
                              isSel ? 'bg-sky-500 border-sky-400 text-white shadow-lg scale-105' : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300'
                            }`}>
                            <span className="text-sm font-bold">{formatTime(slot)}</span>
                            <span className={`text-xs ${isSel ? 'text-sky-100' : 'text-slate-400'}`}>→ {formatTime(endSlot)}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedSlot && (
                <>
                  <div className="animate-fade-up">
                    <label className="block text-slate-700 font-bold text-sm mb-2">📝 Notes (optional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                      placeholder="Any requests for the provider?" className="sky-input resize-none text-sm" />
                  </div>
                  <div className="animate-fade-up bg-sky-50 rounded-xl p-4 border border-sky-100 space-y-2">
                    <p className="text-slate-700 font-bold text-sm">📋 Summary</p>
                    {[['Service', selectedService.title], ['Date', formatDate(selectedDate)], ['Time', formatTime(selectedSlot)], ['Duration', `${selectedService.duration_minutes} mins`]].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-400 text-xs">{k}</span>
                        <span className="text-slate-700 text-xs font-semibold">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-sky-200 pt-2">
                      <span className="text-slate-500 text-sm font-bold">Total</span>
                      <span className="text-sky-600 font-black text-base">${Number(selectedService.price).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
              {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">❌ {error}</p>}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
              {!currentUser ? (
                <Link href="/auth/login" className="w-full btn-shimmer text-center block py-4 text-sm">Sign In to Book</Link>
              ) : (
                <button onClick={handleBook} disabled={!selectedDate || !selectedSlot || booking}
                  className="w-full btn-shimmer py-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {booking ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Sending...
                    </span>
                  ) : (!selectedDate || !selectedSlot) ? 'Pick Date & Time First' : '📅 Confirm Booking'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-sky-100 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/explore" className="text-sky-500 hover:text-sky-700 transition font-medium text-sm">← Browse Shops</Link>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 text-sm font-semibold">{provider.business_name || provider.full_name}</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Shop Hero */}
        <div className="glass rounded-2xl overflow-hidden mb-8 animate-fade-up">
          <div className="relative h-48 bg-gradient-to-br from-sky-400 to-blue-600 overflow-hidden">
            {provider.avatar_url && (
              <img src={provider.avatar_url} alt="" className="w-full h-full object-cover opacity-60" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-5 flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                {provider.avatar_url ? <img src={provider.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl">{icon}</span>}
              </div>
              <div>
                <h1 className="text-white font-black text-2xl drop-shadow">{provider.business_name || provider.full_name}</h1>
                <p className="text-white/80 text-sm">{provider.full_name}</p>
              </div>
            </div>
          </div>
          <div className="p-5 flex flex-wrap gap-3 items-start justify-between">
            <div className="flex flex-wrap gap-3">
              {provider.category && <span className="flex items-center gap-1.5 text-sm text-sky-600 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-full font-semibold">{icon} {provider.category}</span>}
              {provider.location && <span className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">📍 {provider.location}</span>}
              {provider.phone && <a href={`tel:${provider.phone}`} className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full hover:bg-green-100 transition">📞 {provider.phone}</a>}
            </div>
            {openDays.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wide">Open</p>
                <div className="flex gap-1 flex-wrap justify-end">
                  {openDays.map(d => (
                    <span key={d.day_of_week} className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-semibold">
                      {DAYS[d.day_of_week]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {provider.bio && <p className="text-slate-500 text-sm px-5 pb-5">{provider.bio}</p>}
        </div>

        {/* Services Grid */}
        <div className="animate-fade-up delay-100">
          <h2 className="text-2xl font-black text-slate-800 mb-5">🛍️ Our Services <span className="text-base font-normal text-slate-400">({services.length})</span></h2>
          {services.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <p className="text-5xl mb-3">🛒</p>
              <p className="text-slate-400 font-semibold">No services listed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((svc, i) => (
                <div key={svc.id} className={`bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-sky-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col animate-fade-up delay-${(i % 4 + 1) * 100}`}>
                  <div className="h-28 bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center relative overflow-hidden">
                    <span className="text-5xl opacity-40">{icon}</span>
                    <div className="absolute top-3 right-3 bg-sky-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{svc.duration_minutes} min</div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-slate-800 text-base mb-1">{svc.title}</h3>
                    {svc.description && <p className="text-slate-400 text-xs line-clamp-2 mb-3 flex-1">{svc.description}</p>}
                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-slate-400 text-xs">Price</p>
                          <p className="text-sky-600 font-black text-xl">${Number(svc.price).toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Duration</p>
                          <p className="text-slate-700 font-bold">{svc.duration_minutes} mins</p>
                        </div>
                      </div>
                      <button onClick={() => openService(svc)} className="w-full btn-shimmer py-3 text-sm rounded-xl">
                        🛒 Book This Service
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
