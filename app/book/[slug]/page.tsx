'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────
interface Provider {
  id: string
  full_name: string
  business_name: string | null
  bio: string | null
  slug: string | null
}

interface Service {
  id: string
  title: string
  duration_minutes: number
  price: number
  description: string | null
}

interface WorkingHour {
  day_of_week: number
  start_time: string
  end_time: string
  is_day_off: boolean
}

interface Booking {
  booking_date: string
  start_time: string
  end_time: string
  status: string
}

// ─── Helper: Generate time slots based on provider hours + service duration ──
function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function generateSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  existingBookings: Booking[],
  selectedDate: string
): string[] {
  const slots: string[] = []
  let current = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  while (current + durationMinutes <= end) {
    const slotStartMins = current
    const slotEndMins = current + durationMinutes

    const slotStartStr = `${String(Math.floor(slotStartMins / 60)).padStart(2, '0')}:${String(slotStartMins % 60).padStart(2, '0')}`

    // ✅ FIX 2: Robust overlap check
    // A slot is blocked if ANY existing booking overlaps with it
    const isBlocked = existingBookings.some((b) => {
      if (b.booking_date !== selectedDate) return false
      const bStartMins = timeToMinutes(b.start_time)
      const bEndMins   = timeToMinutes(b.end_time)

      // Overlap condition: slot starts before booking ends AND slot ends after booking starts
      return slotStartMins < bEndMins && slotEndMins > bStartMins
    })

    if (!isBlocked) {
      slots.push(slotStartStr)
    }

    current += durationMinutes
  }

  return slots
}


// ─── Helper: Format date display ────────────────────────
function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

// ─── Main Component ──────────────────────────────────────
export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const supabase = createClient()

  const [provider, setProvider] = useState<Provider | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [blockedDates, setBlockedDates] = useState<string[]>([])
  const [existingBookings, setExistingBookings] = useState<Booking[]>([])

  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [dateError, setDateError] = useState('')

  // ── Fetch Provider Data ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Get logged in user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user ? { id: user.id } : null)

      // Find provider by slug OR by id
      const { data: providerData } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, bio, slug')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .eq('role', 'provider')
        .single()

      if (!providerData) { setLoading(false); return }
      setProvider(providerData)

      // Fetch services, working hours, blocked dates, bookings in parallel
      const [svcRes, whRes, bdRes, bkRes] = await Promise.all([
        supabase.from('services').select('*').eq('provider_id', providerData.id).eq('is_active', true),
        supabase.from('working_hours').select('*').eq('provider_id', providerData.id),
        supabase.from('blocked_dates').select('blocked_date').eq('provider_id', providerData.id),
        supabase.from('bookings').select('booking_date, start_time, end_time, status').eq('provider_id', providerData.id),
      ])

      setServices(svcRes.data || [])
      setWorkingHours(whRes.data || [])
      setBlockedDates((bdRes.data || []).map((b: { blocked_date: string }) => b.blocked_date))
      setExistingBookings(bkRes.data || [])
      setLoading(false)
    }

    init()
  }, [slug])

  // ── Generate Slots When Date + Service Selected ──────
useEffect(() => {
  if (!selectedDate || !selectedService || !provider) {
    setAvailableSlots([])
    setSelectedSlot('')
    return
  }

  const checkAndGenerate = async () => {
    setSlotsLoading(true)
    setSelectedSlot('')
    setDateError('')

    // ✅ FIX 1: Always fetch FRESH bookings from DB before generating slots
    // This prevents showing already-booked slots to new customers
    const { data: freshBookings } = await supabase
      .from('bookings')
      .select('booking_date, start_time, end_time, status')
      .eq('provider_id', provider.id)
      .eq('booking_date', selectedDate)
      .neq('status', 'cancelled') // ignore cancelled bookings

    const activeBookings = freshBookings || []

    const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()

    // Check if blocked date
    if (blockedDates.includes(selectedDate)) {
      setDateError('This date is blocked by the provider.')
      setAvailableSlots([])
      setSlotsLoading(false)
      return
    }

    // Check working hours for this day
    const daySchedule = workingHours.find((wh) => wh.day_of_week === dayOfWeek)

    if (!daySchedule || daySchedule.is_day_off) {
      setDateError('Provider is not available on this day.')
      setAvailableSlots([])
      setSlotsLoading(false)
      return
    }

    // Generate slots using FRESH bookings
    const slots = generateSlots(
      daySchedule.start_time.slice(0, 5),
      daySchedule.end_time.slice(0, 5),
      selectedService.duration_minutes,
      activeBookings,
      selectedDate
    )

    setAvailableSlots(slots)
    setSlotsLoading(false)
  }

  checkAndGenerate()
}, [selectedDate, selectedService, provider])


  // ── Handle Booking Submission ────────────────────────
  const handleBook = async () => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=/book/${slug}`)
      return
    }

    if (!selectedService || !selectedDate || !selectedSlot || !provider) return

    setBooking(true)
    setError('')

    const [h, m] = selectedSlot.split(':').map(Number)
    const endMinutes = h * 60 + m + selectedService.duration_minutes
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
     // ✅ FIX 4: Re-check slot availability one more time before inserting
  const { data: lastCheck } = await supabase
    .from('bookings')
    .select('id')
    .eq('provider_id', provider.id)
    .eq('booking_date', selectedDate)
    .neq('status', 'cancelled')
    .lt('start_time', endTime)
    .gt('end_time', selectedSlot)
  if (lastCheck && lastCheck.length > 0) {
    setError('Sorry! This slot was just booked by someone else. Please choose another time.')
    setSelectedSlot('')
    setBooking(false)
    // Refresh slots to show updated availability
    const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()
    const daySchedule = workingHours.find(wh => wh.day_of_week === dayOfWeek)
    if (daySchedule) {
      const { data: freshBookings } = await supabase
        .from('bookings')
        .select('booking_date, start_time, end_time, status')
        .eq('provider_id', provider.id)
        .eq('booking_date', selectedDate)
        .neq('status', 'cancelled')
      const slots = generateSlots(
        daySchedule.start_time.slice(0, 5),
        daySchedule.end_time.slice(0, 5),
        selectedService.duration_minutes,
        freshBookings || [],
        selectedDate
      )
      setAvailableSlots(slots)
    }
    return
  }

    const { error: bookingError } = await supabase.from('bookings').insert({
      provider_id: provider.id,
      customer_id: currentUser.id,
      service_id: selectedService.id,
      booking_date: selectedDate,
      start_time: selectedSlot,
      end_time: endTime,
      status: 'confirmed',
      customer_notes: notes || null,
    })

    if (bookingError) {
      setError(bookingError.message)
      setBooking(false)
    } else {
      setSuccess(true)
    }
  }

  // ─── Loading State ───────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading booking page...</div>
      </div>
    )
  }

  // ─── Provider Not Found ──────────────────────────────
  if (!provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-white mb-2">Provider Not Found</h1>
          <p className="text-white/50 mb-6">This booking link doesn&apos;t exist.</p>
          <Link href="/explore" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl transition">
            Browse Providers
          </Link>
        </div>
      </div>
    )
  }

  // ─── Booking Success Screen ──────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h1>
          <div className="bg-white/5 rounded-xl p-4 my-5 text-left space-y-2">
            <p className="text-white/60 text-sm">Provider</p>
            <p className="text-white font-medium">{provider.business_name || provider.full_name}</p>
            <p className="text-white/60 text-sm mt-3">Service</p>
            <p className="text-white font-medium">{selectedService?.title}</p>
            <p className="text-white/60 text-sm mt-3">Date & Time</p>
            <p className="text-white font-medium">{formatDate(selectedDate)}</p>
            <p className="text-purple-300 font-medium">{formatTime(selectedSlot)}</p>
          </div>
          <div className="flex gap-3 mt-4">
            <Link
              href="/dashboard/customer"
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              My Appointments
            </Link>
            <Link
              href="/explore"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition text-sm"
            >
              Browse More
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main Booking UI ─────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

      {/* Navbar */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">📅 BookIt</Link>
          {!currentUser && (
            <Link href="/auth/login" className="text-sm text-purple-300 hover:text-purple-200 transition">
              Sign in to book
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">

        {/* Provider Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {provider.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {provider.business_name || provider.full_name}
            </h1>
            <p className="text-purple-300 text-sm">{provider.full_name}</p>
            {provider.bio && <p className="text-white/50 text-sm mt-1">{provider.bio}</p>}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">

          {/* ── STEP 1: Select Service ── */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">
              <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full mr-2">1</span>
              Select a Service
            </h2>
            {services.length === 0 ? (
              <p className="text-white/40 text-sm">No services available yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => { setSelectedService(svc); setSelectedDate(''); setSelectedSlot('') }}
                    className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedService?.id === svc.id
                        ? 'bg-purple-600/30 border-purple-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/80 hover:border-white/30'
                    }`}
                  >
                    <p className="font-semibold">{svc.title}</p>
                    <p className="text-sm mt-1 opacity-70">
                      {svc.duration_minutes} mins · ${Number(svc.price).toFixed(2)}
                    </p>
                    {svc.description && (
                      <p className="text-xs mt-1 opacity-50">{svc.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── STEP 2: Select Date ── */}
          {selectedService && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-4">
                <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full mr-2">2</span>
                Select a Date
              </h2>
              <input
                type="date"
                min={getTodayString()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white/10 border border-white/30 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 w-full sm:w-auto"
              />
              {dateError && (
                <p className="text-red-300 text-sm mt-3 bg-red-500/20 px-4 py-2 rounded-lg">
                  ❌ {dateError}
                </p>
              )}
              {selectedDate && !dateError && (
                <p className="text-purple-300 text-sm mt-3">
                  📅 {formatDate(selectedDate)}
                </p>
              )}
            </div>
          )}

         {/* ── STEP 3: Select Time Slot ── */}
{selectedDate && !dateError && (
  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-white">
        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full mr-2">3</span>
        Select a Time Slot
      </h2>
      {/* ✅ Show service duration clearly */}
      {selectedService && (
        <span className="text-xs bg-purple-500/30 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
          ⏱ {selectedService.duration_minutes} min per slot
        </span>
      )}
    </div>

    {/* Provider working hours info */}
    {selectedDate && (() => {
      const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()
      const daySchedule = workingHours.find(wh => wh.day_of_week === dayOfWeek)
      if (!daySchedule || daySchedule.is_day_off) return null
      return (
        <p className="text-white/40 text-xs mb-4">
          🕐 Provider works {formatTime(daySchedule.start_time.slice(0,5))} – {formatTime(daySchedule.end_time.slice(0,5))} on this day
        </p>
      )
    })()}

    {slotsLoading ? (
      <p className="text-white/50 animate-pulse text-sm">Checking availability...</p>
    ) : availableSlots.length === 0 ? (
      <div className="text-center py-6">
        <p className="text-3xl mb-2">📅</p>
        <p className="text-white/50 text-sm">
          All slots are booked for this date.
          <br />Please try another day.
        </p>
      </div>
    ) : (
      <>
        <p className="text-white/40 text-xs mb-3">
          {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''} available
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {availableSlots.map((slot) => {
            // Calculate end time for display
            const [h, m] = slot.split(':').map(Number)
            const endMins = h * 60 + m + (selectedService?.duration_minutes || 30)
            const endSlot = `${String(Math.floor(endMins / 60)).padStart(2,'0')}:${String(endMins % 60).padStart(2,'0')}`

            return (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`flex flex-col items-center py-3 px-2 rounded-xl text-xs font-medium border-2 transition-all duration-200 ${
                  selectedSlot === slot
                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 border-white/10 text-white/70 hover:border-purple-400 hover:text-white'
                }`}
              >
                <span className="font-bold text-sm">{formatTime(slot)}</span>
                <span className="opacity-60 mt-0.5">to {formatTime(endSlot)}</span>
              </button>
            )
          })}
        </div>
      </>
    )}
  </div>
)}


          {/* ── STEP 4: Notes + Confirm ── */}
          {selectedSlot && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-4">
                <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full mr-2">4</span>
                Confirm Booking
              </h2>

              {/* Summary */}
              <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">Service</span>
                  <span className="text-white text-sm font-medium">{selectedService?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">Date</span>
                  <span className="text-white text-sm font-medium">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">Time</span>
                  <span className="text-purple-300 text-sm font-medium">{formatTime(selectedSlot)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50 text-sm">Duration</span>
                  <span className="text-white text-sm font-medium">{selectedService?.duration_minutes} mins</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                  <span className="text-white/50 text-sm">Price</span>
                  <span className="text-white font-bold">${Number(selectedService?.price).toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for the provider? (optional)"
                rows={2}
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none mb-4 text-sm"
              />

              {error && (
                <p className="text-red-300 text-sm mb-4 bg-red-500/20 px-4 py-2 rounded-lg">❌ {error}</p>
              )}

              {/* Book Button */}
              {currentUser ? (
                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30"
                >
                  {booking ? 'Confirming...' : '✅ Confirm Booking'}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-3">You need to be logged in to book</p>
                  <Link
                    href={`/auth/login`}
                    className="inline-block w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition text-center"
                  >
                    Sign In to Book
                  </Link>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
