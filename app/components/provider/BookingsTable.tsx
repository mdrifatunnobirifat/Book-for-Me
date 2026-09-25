'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function isPast(dateStr: string, timeStr: string) {
  const bookingDateTime = new Date(`${dateStr}T${timeStr}`)
  return bookingDateTime < new Date()
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-500/20 text-green-300 border-green-500/40',
  pending:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/40',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: '✅ Confirmed',
  pending:   '⏳ Waiting',
  cancelled: '❌ Rejected',
  completed: '🏁 Completed',
}

export default function BookingsTable({ bookings, providerName, onRefresh }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [emailSending, setEmailSending] = useState<string | null>(null)
  const supabase = createClient()

  // Compute effective status (past confirmed → completed)
  const getEffectiveStatus = (b: Booking) => {
    if (b.status === 'confirmed' && isPast(b.booking_date, b.end_time)) return 'completed'
    return b.status
  }

  // Filter bookings
  const filtered = bookings.filter((b) => {
    const eff = getEffectiveStatus(b)
    return filter === 'all' || eff === filter
  })

  // Count by status
  const counts = {
    all:       bookings.length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed' && !isPast(b.booking_date, b.end_time)).length,
    completed: bookings.filter(b => b.status === 'confirmed' && isPast(b.booking_date, b.end_time)).length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }

  // Send email notification
  const sendNotification = async (booking: Booking, status: string, rescheduleData?: { date: string; time: string }) => {
    try {
      setEmailSending(booking.id)
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: booking.customer?.email || '',
          customerName: booking.customer?.full_name || 'Customer',
          providerName,
          serviceName: booking.services?.title,
          bookingDate: formatDate(booking.booking_date),
          bookingTime: formatTime(booking.start_time),
          status,
          newDate: rescheduleData ? formatDate(rescheduleData.date) : '',
          newTime: rescheduleData ? formatTime(rescheduleData.time) : '',
        }),
      })
    } catch (e) {
      console.error('Email failed:', e)
    } finally {
      setEmailSending(null)
    }
  }

  // Update status
  const handleStatusChange = async (booking: Booking, newStatus: string) => {
    if (booking.status === 'cancelled') return // Cannot undo rejection
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

  // Reschedule booking
  const handleReschedule = async (booking: Booking) => {
    if (!newDate || !newTime) return
    setUpdating(booking.id)

    // Calculate new end time
    const [h, m] = newTime.split(':').map(Number)
    const endMins = h * 60 + m + booking.services.duration_minutes
    const newEndTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`

    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: newDate,
        start_time: newTime,
        end_time: newEndTime,
        status: 'confirmed',
      })
      .eq('id', booking.id)

    if (!error) {
      await sendNotification(booking, 'rescheduled', { date: newDate, time: newTime })
      setRescheduleId(null)
      setNewDate('')
      setNewTime('')
      onRefresh()
    }
    setUpdating(null)
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-white">📋 Booking Requests</h2>
        <span className="text-white/40 text-sm">{bookings.length} total</span>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
              filter === s
                ? 'bg-purple-600 border-purple-400 text-white'
                : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40'
            }`}
          >
            {s === 'all' ? '📋 All' :
             s === 'pending' ? '⏳ Waiting' :
             s === 'confirmed' ? '✅ Confirmed' :
             s === 'completed' ? '🏁 Completed' : '❌ Rejected'}
            <span className="ml-1.5 bg-white/10 px-1.5 py-0.5 rounded-full">
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-white/50 text-sm">No bookings in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const effectiveStatus = getEffectiveStatus(booking)
            const isRejected = booking.status === 'cancelled'
            const isPastBooking = effectiveStatus === 'completed'
            const isUpdating = updating === booking.id

            return (
              <div
                key={booking.id}
                className={`rounded-xl border p-4 transition-all ${
                  isPastBooking
                    ? 'bg-white/3 border-white/5 opacity-70'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {/* Top Row — Customer + Status */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {/* Customer Avatar */}
                      <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {booking.customer?.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-semibold">
                        {booking.customer?.full_name}
                      </span>
                      {emailSending === booking.id && (
                        <span className="text-xs text-purple-300 animate-pulse">📧 sending...</span>
                      )}
                    </div>
                    <p className="text-purple-300 text-sm ml-10">{booking.services?.title}</p>
                    {booking.customer_notes && (
                      <p className="text-white/40 text-xs ml-10 mt-1 italic">
                        &ldquo;{booking.customer_notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span className={`text-xs px-3 py-1 rounded-full border font-medium ${STATUS_STYLES[effectiveStatus] || ''}`}>
                    {STATUS_LABELS[effectiveStatus]}
                  </span>
                </div>

                {/* Date + Time + Price */}
                <div className="flex flex-wrap gap-4 text-sm mb-4 ml-10">
                  <div>
                    <span className="text-white/40 text-xs block">Date</span>
                    <span className="text-white">{formatDate(booking.booking_date)}</span>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs block">Time</span>
                    <span className="text-purple-300 font-medium">
                      {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs block">Duration</span>
                    <span className="text-white">{booking.services?.duration_minutes} min</span>
                  </div>
                  <div>
                    <span className="text-white/40 text-xs block">Price</span>
                    <span className="text-green-300 font-medium">
                      ${Number(booking.services?.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons — only for non-past, non-rejected bookings */}
                {!isPastBooking && !isRejected && (
                  <div className="ml-10 space-y-3">

                    {/* Status Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleStatusChange(booking, 'confirmed')}
                        disabled={isUpdating || booking.status === 'confirmed'}
                        className={`text-xs px-4 py-1.5 rounded-lg border transition font-medium ${
                          booking.status === 'confirmed'
                            ? 'bg-green-500/30 border-green-500/50 text-green-300 cursor-default'
                            : 'bg-white/5 border-green-500/30 text-green-300 hover:bg-green-500/20'
                        }`}
                      >
                        {isUpdating ? '...' : '✅ Confirm'}
                      </button>

                      <button
                        onClick={() => handleStatusChange(booking, 'pending')}
                        disabled={isUpdating || booking.status === 'pending'}
                        className={`text-xs px-4 py-1.5 rounded-lg border transition font-medium ${
                          booking.status === 'pending'
                            ? 'bg-yellow-500/30 border-yellow-500/50 text-yellow-300 cursor-default'
                            : 'bg-white/5 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20'
                        }`}
                      >
                        {isUpdating ? '...' : '⏳ Waitlist'}
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm('Reject this booking? This cannot be undone.')) {
                            handleStatusChange(booking, 'cancelled')
                          }
                        }}
                        disabled={isUpdating}
                        className="text-xs px-4 py-1.5 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/20 transition font-medium"
                      >
                        {isUpdating ? '...' : '❌ Reject'}
                      </button>

                      <button
                        onClick={() => {
                          setRescheduleId(rescheduleId === booking.id ? null : booking.id)
                          setNewDate(booking.booking_date)
                          setNewTime(booking.start_time.slice(0, 5))
                        }}
                        className="text-xs px-4 py-1.5 rounded-lg border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition font-medium"
                      >
                        🗓️ Reschedule
                      </button>
                    </div>

                    {/* Reschedule Panel */}
                    {rescheduleId === booking.id && (
                      <div className="bg-white/5 border border-purple-500/30 rounded-xl p-4 space-y-3">
                        <p className="text-purple-300 text-xs font-semibold">
                          📬 Customer will be notified by email
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <div>
                            <label className="text-white/50 text-xs block mb-1">New Date</label>
                            <input
                              type="date"
                              value={newDate}
                              min={new Date().toISOString().split('T')[0]}
                              onChange={(e) => setNewDate(e.target.value)}
                              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                          </div>
                          <div>
                            <label className="text-white/50 text-xs block mb-1">New Time</label>
                            <input
                              type="time"
                              value={newTime}
                              onChange={(e) => setNewTime(e.target.value)}
                              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReschedule(booking)}
                            disabled={!newDate || !newTime || isUpdating}
                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs px-5 py-2 rounded-lg transition font-semibold"
                          >
                            {isUpdating ? 'Saving...' : 'Save & Notify Customer'}
                          </button>
                          <button
                            onClick={() => setRescheduleId(null)}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected — show permanent message */}
                {isRejected && (
                  <p className="ml-10 text-red-300/50 text-xs italic">
                    This booking was rejected and cannot be changed.
                  </p>
                )}

                {/* Completed — show past label */}
                {isPastBooking && (
                  <p className="ml-10 text-blue-300/50 text-xs italic">
                    This appointment has already taken place.
                  </p>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
