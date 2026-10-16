'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Provider { id: string; full_name: string; business_name: string | null; bio: string | null }
interface Service { id: string; title: string; duration_minutes: number; price: number; description: string | null }
interface WorkingHour { day_of_week: number; start_time: string; end_time: string; is_day_off: boolean }
interface Booking { booking_date: string; start_time: string; end_time: string; status: string }

function timeToMins(t: string) { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m }
function minsToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
function formatDate(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }
function formatTime(t: string) { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
function today() { return new Date().toISOString().split('T')[0] }

function generateSlots(start: string, end: string, dur: number, bookings: Booking[], date: string): string[] {
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

export default function BookingPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const supabase = createClient()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)

  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')
  const [step, setStep] = useState(1)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user ? { id: user.id } : null)
      const { data: prov } = await supabase.from('profiles')
        .select('id, full_name, business_name, bio').or(`slug.eq.${slug},id.eq.${slug}`).eq('role', 'provider').single()
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
      const { data: fresh } = await supabase.from('bookings').select('booking_date,start_time,end_time,status')
        .eq('provider_id', provider.id).eq('booking_date', selectedDate).neq('status', 'cancelled')
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()
      if (blockedDates.includes(selectedDate)) { setDateError('This date is blocked by the provider.'); setAvailableSlots([]); setSlotsLoading(false); return }
      const sched = workingHours.find(wh => wh.day_of_week === dayOfWeek)
      if (!sched || sched.is_day_off) { setDateError('Provider is not available on this day.'); setAvailableSlots([]); setSlotsLoading(false); return }
      setAvailableSlots(generateSlots(sched.start_time.slice(0, 5), sched.end_time.slice(0, 5), selectedService.duration_minutes, fresh || [], selectedDate))
      setSlotsLoading(false)
    }
    check()
  }, [selectedDate, selectedService])

  const handleBook = async () => {
    if (!currentUser) { router.push('/auth/login'); return }
    if (!selectedService || !selectedDate || !selectedSlot || !provider) return
    setBooking(true); setError('')
    const endTime = minsToTime(timeToMins(selectedSlot) + selectedService.duration_minutes)
    const { data: clash } = await supabase.from('bookings').select('id').eq('provider_id', provider.id)
      .eq('booking_date', selectedDate).neq('status', 'cancelled').lt('start_time', endTime).gt('end_time', selectedSlot)
    if (clash && clash.length > 0) { setError('Slot just taken. Choose another.'); setSelectedSlot(''); setBooking(false); return }
    const { error: err } = await supabase.from('bookings').insert({
      provider_id: provider.id, customer_id: currentUser.id, service_id: selectedService.id,
      booking_date: selectedDate, start_time: selectedSlot, end_time: endTime,
      status: 'pending', customer_notes: notes || null,
    })
    if (err) { setError(err.message); setBooking(false) } else { setSuccess(true) }
  }

  if (loading) return (
    <div className="sky-bg min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sky-600 font-medium">Loading...</p>
      </div>
    </div>
  )

  if (!provider) return (
    <div className="sky-bg min-h-screen flex items-center justify-center">
      <div className="glass rounded-2xl p-10 text-center animate-bounce-in">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Provider Not Found</h1>
        <Link href="/explore" className="btn-shimmer inline-block mt-4 px-6 py-3 text-sm">Browse Providers</Link>
      </div>
    </div>
  )

  if (success) return (
    <div className="sky-bg min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center animate-bounce-in">
        <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 animate-float">
          🎉
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">Booking Sent!</h1>
        <p className="text-slate-500 text-sm mb-6">Your request has been sent. You'll be notified once confirmed.</p>
        <div className="bg-sky-50 rounded-xl p-4 my-4 text-left space-y-3 border border-sky-100">
          {[
            ['Provider', provider.business_name || provider.full_name],
            ['Service', selectedService?.title],
            ['Date', formatDate(selectedDate)],
            ['Time', formatTime(selectedSlot)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-slate-400 text-sm">{k}</span>
              <span className="text-slate-800 text-sm font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <Link href="/dashboard/customer" className="flex-1 btn-shimmer text-center py-3 text-sm block">My Bookings</Link>
          <Link href="/explore" className="flex-1 bg-white hover:bg-sky-50 text-sky-600 font-semibold border-2 border-sky-200 py-3 text-sm rounded-xl transition text-center">Browse More</Link>
        </div>
      </div>
    </div>
  )

  const steps = ['Select Service','Pick a Date','Choose Time','Confirm']

  return (
    <div className="sky-bg min-h-screen">
      <nav className="bg-white/80 backdrop-blur-md border-b border-sky-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="text-xl font-black text-sky-700">BookIt</span>
          </Link>
          {!currentUser && <Link href="/auth/login" className="text-sm text-sky-500 hover:text-sky-700 font-semibold transition">Sign in to book</Link>}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-6">
        {/* Provider Card */}
        <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-4 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-black text-2xl flex-shrink-0 animate-float">
            {provider.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{provider.business_name || provider.full_name}</h1>
            <p className="text-sky-500 text-sm">{provider.full_name}</p>
            {provider.bio && <p className="text-slate-400 text-sm mt-0.5">{provider.bio}</p>}
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2 mb-6 animate-fade-up">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                step > i + 1 ? 'bg-sky-500 text-white' : step === i + 1 ? 'bg-sky-500 text-white shadow-lg shadow-sky-200 scale-110' : 'bg-sky-100 text-sky-400'
              }`}>{step > i + 1 ? '✓' : i + 1}</div>
              <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-sky-600' : 'text-slate-400'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${step > i + 1 ? 'bg-sky-400' : 'bg-sky-100'}`} />}
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {/* Step 1: Service */}
          <div className={`glass rounded-2xl p-5 transition-all duration-300 animate-fade-up ${step !== 1 && selectedService ? 'opacity-80' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-7 h-7 bg-sky-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Select a Service
              </h2>
              {selectedService && step !== 1 && (
                <button onClick={() => { setStep(1); setSelectedDate(''); setSelectedSlot('') }} className="text-xs text-sky-500 hover:text-sky-700 font-semibold">Change</button>
              )}
            </div>
            {selectedService && step !== 1 ? (
              <div className="bg-sky-50 rounded-xl px-4 py-3 flex justify-between items-center border border-sky-100">
                <span className="text-slate-800 font-medium text-sm">{selectedService.title}</span>
                <span className="text-sky-600 font-bold text-sm">${Number(selectedService.price).toFixed(2)} · {selectedService.duration_minutes}m</span>
              </div>
            ) : services.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No services available yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(svc => (
                  <button key={svc.id} onClick={() => { setSelectedService(svc); setStep(2) }}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                      selectedService?.id === svc.id
                        ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:shadow-md'
                    }`}>
                    <p className="font-bold">{svc.title}</p>
                    <p className={`text-sm mt-1 ${selectedService?.id === svc.id ? 'text-sky-100' : 'text-slate-400'}`}>
                      {svc.duration_minutes} mins · ${Number(svc.price).toFixed(2)}
                    </p>
                    {svc.description && <p className={`text-xs mt-1 ${selectedService?.id === svc.id ? 'text-sky-100' : 'text-slate-400'}`}>{svc.description}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Date */}
          {step >= 2 && (
            <div className="glass rounded-2xl p-5 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-7 h-7 bg-sky-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Select a Date
                </h2>
                {selectedDate && step !== 2 && (
                  <button onClick={() => { setStep(2); setSelectedSlot('') }} className="text-xs text-sky-500 hover:text-sky-700 font-semibold">Change</button>
                )}
              </div>
              {selectedDate && step !== 2 ? (
                <div className="bg-sky-50 rounded-xl px-4 py-3 border border-sky-100">
                  <span className="text-slate-800 font-medium text-sm">📅 {formatDate(selectedDate)}</span>
                </div>
              ) : (
                <>
                  <input type="date" min={today()} value={selectedDate}
                    onChange={e => { setSelectedDate(e.target.value); if (e.target.value) setStep(3) }}
                    className="sky-input w-full sm:w-auto" />
                  {dateError && <p className="text-red-500 text-sm mt-3 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">❌ {dateError}</p>}
                  {selectedDate && !dateError && <p className="text-sky-500 text-sm mt-3 font-medium">📅 {formatDate(selectedDate)}</p>}
                </>
              )}
            </div>
          )}

          {/* Step 3: Time */}
          {step >= 3 && !dateError && (
            <div className="glass rounded-2xl p-5 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-7 h-7 bg-sky-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Select a Time
                </h2>
                <span className="text-xs bg-sky-100 text-sky-600 px-3 py-1 rounded-full font-semibold border border-sky-200">
                  ⏱ {selectedService?.duration_minutes} min slots
                </span>
              </div>
              {slotsLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-slate-400 text-sm">Checking availability...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No available slots. Try another date.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableSlots.map(slot => {
                    const endSlot = minsToTime(timeToMins(slot) + (selectedService?.duration_minutes || 30))
                    const isSelected = selectedSlot === slot
                    return (
                      <button key={slot} onClick={() => { setSelectedSlot(slot); setStep(4) }}
                        className={`flex flex-col items-center py-3 px-1 rounded-xl text-xs font-semibold border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                          isSelected
                            ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-200 scale-105'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:shadow-md'
                        }`}>
                        <span className="font-bold text-sm">{formatTime(slot)}</span>
                        <span className={`mt-0.5 text-xs ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>to {formatTime(endSlot)}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirm */}
          {step >= 4 && selectedSlot && (
            <div className="glass rounded-2xl p-5 animate-fade-up border-t-4 border-sky-400">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-sky-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                Confirm Booking
              </h2>
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 mb-4 border border-sky-100 space-y-3">
                {[
                  ['Service', selectedService?.title || ''],
                  ['Provider', provider.business_name || provider.full_name],
                  ['Date', formatDate(selectedDate)],
                  ['Time', formatTime(selectedSlot)],
                  ['Duration', `${selectedService?.duration_minutes} mins`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400 text-sm">{k}</span>
                    <span className="text-slate-800 text-sm font-semibold">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-sky-200 pt-3 mt-1">
                  <span className="text-slate-500 font-semibold text-sm">Total Price</span>
                  <span className="text-sky-600 font-black text-lg">${Number(selectedService?.price).toFixed(2)}</span>
                </div>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Notes for the provider? (optional)" className="sky-input resize-none mb-4 text-sm" />
              {error && <p className="text-red-500 text-sm mb-4 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">❌ {error}</p>}
              {currentUser ? (
                <button onClick={handleBook} disabled={booking} className="w-full btn-shimmer py-4 disabled:opacity-60 disabled:cursor-not-allowed">
                  {booking ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending request...
                    </span>
                  ) : '📅 Send Booking Request'}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-3">Sign in to confirm your booking</p>
                  <Link href="/auth/login" className="w-full btn-shimmer inline-block py-4 text-center">Sign In to Book</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
