'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildGoogleCalendarUrl } from '@/lib/calendar'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  customer_notes: string | null
  services: { title: string; duration_minutes: number; price: number }
  customer: { id: string; full_name: string; email?: string }
}

interface Props {
  bookings: Booking[]
  providerName: string
  onRefresh: () => void
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'

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

function isPast(dateStr: string, timeStr: string) {
  const bookingDateTime = new Date(`${dateStr}T${timeStr}`)
  return bookingDateTime < new Date()
}

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  confirmed: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: '✅ Confirmed' },
  pending:   { badge: 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse', label: '⏳ Waiting' },
  cancelled: { badge: 'bg-rose-100 text-rose-700 border-rose-300', label: '❌ Cancelled' },
  completed: { badge: 'bg-sky-100 text-sky-700 border-sky-300', label: '🏁 Completed' },
}

export default function BookingsTable({ bookings, providerName, onRefresh }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [notifyMsg, setNotifyMsg] = useState('')
  const supabase = createClient()

  const getEffectiveStatus = (b: Booking) => {
    if (b.status === 'confirmed' && isPast(b.booking_date, b.end_time)) return 'completed'
    return b.status
  }

  const filtered = bookings.filter((b) => {
    const eff = getEffectiveStatus(b)
    return filter === 'all' || eff === filter
  })

  const sendNotification = async (
    booking: Booking,
    newStatus: string,
    rescheduleData?: { date: string; time: string }
  ) => {
    try {
      // Find customer email if not attached
      let recipientEmail = booking.customer?.email
      if (!recipientEmail) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', booking.customer?.id)
          .single()
        recipientEmail = prof?.email
      }

      if (recipientEmail) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: recipientEmail,
            customerName: booking.customer?.full_name || 'Customer',
            providerName,
            serviceName: booking.services?.title,
            bookingDate: formatDate(booking.booking_date),
            bookingTime: formatTime(booking.start_time),
            status: newStatus,
            newDate: rescheduleData ? formatDate(rescheduleData.date) : undefined,
            newTime: rescheduleData ? formatTime(rescheduleData.time) : undefined,
            notes: booking.customer_notes,
          }),
        })
        setNotifyMsg(`📧 Notification sent to ${recipientEmail}`)
        setTimeout(() => setNotifyMsg(''), 4000)
      }
    } catch (e) {
      console.warn('Notification non-critical failure:', e)
    }
  }

  const handleStatusChange = async (booking: Booking, newStatus: string) => {
    setUpdating(booking.id)
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id)

    if (!error) {
      await sendNotification(booking, newStatus)
      onRefresh()
    }
    setUpdating(null)
  }

  const handleReschedule = async (booking: Booking) => {
    if (!newDate || !newTime) return
    setUpdating(booking.id)

    const dur = booking.services?.duration_minutes || 30
    const [h, m] = newTime.split(':').map(Number)
    const endMinutes = h * 60 + m + dur
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(
      endMinutes % 60
    ).padStart(2, '0')}:00`

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: newDate,
        start_time: newTime + ':00',
        end_time: endTime,
        status: 'confirmed',
      })
      .eq('id', booking.id)

    if (!error) {
      await sendNotification(booking, 'rescheduled', { date: newDate, time: newTime })
      setRescheduleId(null)
      onRefresh()
    }
    setUpdating(null)
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-xl border border-sky-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>📋</span> Appointment Bookings
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Manage customer orders and status updates</p>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold capitalize transition-all ${
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

      {notifyMsg && (
        <div className="bg-sky-50 border border-sky-200 text-sky-700 text-xs px-4 py-2.5 rounded-xl mb-4 font-semibold animate-fade-in flex items-center gap-2">
          <span>📬</span> {notifyMsg}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-14 bg-sky-50/50 rounded-xl border border-dashed border-sky-200">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-slate-500 text-sm font-semibold">No bookings found in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const eff = getEffectiveStatus(b)
            const style = STATUS_STYLES[eff] || STATUS_STYLES.pending
            const isUpdating = updating === b.id

            const calUrl = buildGoogleCalendarUrl({
              title: `${b.services?.title} with ${b.customer?.full_name || 'Customer'}`,
              date: b.booking_date,
              startTime: b.start_time.slice(0, 5),
              endTime: b.end_time.slice(0, 5),
              description: `BookIt Booking\nCustomer: ${b.customer?.full_name || 'Customer'}\nNotes: ${b.customer_notes || 'None'}`,
            })

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-sky-200 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white font-bold flex items-center justify-center text-base shadow-sm">
                      {b.customer?.full_name ? b.customer.full_name.charAt(0).toUpperCase() : '👤'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base">
                        {b.customer?.full_name || 'Customer'}
                      </h4>
                      <p className="text-sky-600 font-bold text-xs">{b.services?.title}</p>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-bold ${style.badge}`}
                  >
                    {style.label}
                  </span>
                </div>

                {b.customer_notes && (
                  <p className="text-slate-500 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 italic">
                    &ldquo;{b.customer_notes}&rdquo;
                  </p>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-sky-50/40 p-3 rounded-xl border border-sky-100 mb-4">
                  <div>
                    <span className="text-slate-400 block font-medium">Date</span>
                    <span className="text-slate-800 font-bold">{formatDate(b.booking_date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Time</span>
                    <span className="text-sky-600 font-bold">
                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Duration</span>
                    <span className="text-slate-700 font-bold">{b.services?.duration_minutes} min</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Price</span>
                    <span className="text-emerald-600 font-extrabold">
                      ${Number(b.services?.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                  {b.status !== 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(b, 'confirmed')}
                      disabled={isUpdating}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3.5 py-1.5 rounded-lg transition"
                    >
                      {isUpdating ? '...' : '✅ Accept & Confirm'}
                    </button>
                  )}

                  {b.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (confirm('Cancel / reject this booking?')) {
                          handleStatusChange(b, 'cancelled')
                        }
                      }}
                      disabled={isUpdating}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3.5 py-1.5 rounded-lg transition"
                    >
                      {isUpdating ? '...' : '❌ Reject'}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setRescheduleId(rescheduleId === b.id ? null : b.id)
                      setNewDate(b.booking_date)
                      setNewTime(b.start_time.slice(0, 5))
                    }}
                    className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold px-3.5 py-1.5 rounded-lg transition"
                  >
                    🗓️ Reschedule
                  </button>

                  <a
                    href={calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ml-auto"
                  >
                    <span>📅</span> Add to Google Calendar
                  </a>
                </div>

                {/* Reschedule Drawer */}
                {rescheduleId === b.id && (
                  <div className="mt-3 bg-sky-50 p-4 rounded-xl border border-sky-200 space-y-3 animate-fade-in">
                    <p className="text-sky-800 text-xs font-bold">
                      📬 Reschedule & Automatically Notify Customer by Email
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <div>
                        <label className="text-slate-600 text-xs block mb-1 font-semibold">New Date</label>
                        <input
                          type="date"
                          value={newDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="sky-input text-xs py-1.5"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 text-xs block mb-1 font-semibold">New Time</label>
                        <input
                          type="time"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="sky-input text-xs py-1.5"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReschedule(b)}
                        disabled={!newDate || !newTime || isUpdating}
                        className="btn-shimmer text-xs px-4 py-2 rounded-lg font-bold"
                      >
                        {isUpdating ? 'Saving...' : 'Confirm New Schedule'}
                      </button>
                      <button
                        onClick={() => setRescheduleId(null)}
                        className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs px-3 py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
