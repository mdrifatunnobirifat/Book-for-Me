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

function parseOrderNotes(raw: string | null) {
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    if (data.orderType === 'grocery_cart') return data
  } catch {
    // not JSON
  }
  return null
}

const STATUS_CONFIG: Record<string, { badge: string; label: string; orderLabel: string }> = {
  confirmed: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: '✅ Confirmed', orderLabel: '👨‍🍳 Preparing / Packed' },
  pending:   { badge: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse', label: '⏳ Waiting', orderLabel: '⏳ New Order' },
  cancelled: { badge: 'bg-rose-100 text-rose-800 border-rose-300', label: '❌ Cancelled', orderLabel: '❌ Cancelled' },
  completed: { badge: 'bg-sky-100 text-sky-800 border-sky-300', label: '🏁 Completed', orderLabel: '🛵 Delivered / Picked Up' },
}

export default function BookingsTable({ bookings, providerName, onRefresh }: Props) {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'orders' | 'appointments'>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [notifyMsg, setNotifyMsg] = useState('')
  const supabase = createClient()

  const filtered = bookings.filter((b) => {
    const orderData = parseOrderNotes(b.customer_notes)
    const isOrder = Boolean(orderData)

    if (typeFilter === 'orders' && !isOrder) return false
    if (typeFilter === 'appointments' && isOrder) return false

    if (filter !== 'all' && b.status !== filter) return false
    return true
  })

  const sendNotification = async (booking: Booking, newStatus: string) => {
    try {
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
        const orderData = parseOrderNotes(booking.customer_notes)
        const title = orderData ? `Order #${booking.id.slice(0, 6)}` : booking.services?.title

        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: recipientEmail,
            customerName: booking.customer?.full_name || 'Customer',
            providerName,
            serviceName: title,
            bookingDate: formatDate(booking.booking_date),
            bookingTime: formatTime(booking.start_time),
            status: newStatus,
            notes: booking.customer_notes,
          }),
        })
        setNotifyMsg(`📬 Customer notified at ${recipientEmail}`)
        setTimeout(() => setNotifyMsg(''), 4000)
      }
    } catch { /* non-critical */ }
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

  const orderCount = bookings.filter((b) => parseOrderNotes(b.customer_notes)).length
  const appointmentCount = bookings.length - orderCount

  return (
    <div className="glass rounded-3xl p-6 md:p-8 shadow-xl border border-sky-100">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>📋</span> Orders & Appointments Management
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Process grocery delivery orders, store pickups, and medical consultation slots
          </p>
        </div>

        {/* Dual Type Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-sky-50 p-1 rounded-xl flex border border-sky-100 text-xs font-bold">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'all' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-sky-600'
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setTypeFilter('orders')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'orders' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-sky-600'
              }`}
            >
              🛒 Grocery Orders ({orderCount})
            </button>
            <button
              onClick={() => setTypeFilter('appointments')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'appointments' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-sky-600'
              }`}
            >
              📅 Appointments ({appointmentCount})
            </button>
          </div>

          {/* Status Pills */}
          <div className="flex gap-1">
            {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold capitalize transition ${
                  filter === f
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-white text-slate-500 hover:bg-sky-50 border border-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notifyMsg && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 text-xs px-4 py-2.5 rounded-2xl mb-4 font-semibold animate-fade-in flex items-center gap-2">
          <span>📬</span> {notifyMsg}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-sky-50/50 rounded-2xl border border-dashed border-sky-200">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-slate-600 font-bold text-sm">No orders or appointments found in this view.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const orderData = parseOrderNotes(b.customer_notes)
            const isOrder = Boolean(orderData)
            const style = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending
            const isUpdating = updating === b.id

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-5 border border-slate-100 hover:border-sky-200 hover:shadow-xl transition-all duration-200"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-white font-black flex items-center justify-center text-lg shadow-sm">
                      {isOrder ? '🛒' : '👤'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-800 text-base">
                          {b.customer?.full_name || 'Customer'}
                        </h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {isOrder ? '🛒 Grocery Order' : '📅 Consultation'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">
                        Ordered on {formatDate(b.booking_date)} at {formatTime(b.start_time)}
                      </p>
                    </div>
                  </div>

                  <span className={`text-xs px-3 py-1 rounded-full border font-bold ${style.badge}`}>
                    {isOrder ? style.orderLabel : style.label}
                  </span>
                </div>

                {/* Body: Grocery Order Details */}
                {isOrder && orderData && (
                  <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-100 mb-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-sky-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-700 uppercase">
                          {orderData.fulfillment === 'delivery' ? '🚚 Home Delivery' : '🛍️ Store Pickup'}
                        </span>
                        {orderData.contactPhone && (
                          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            📞 {orderData.contactPhone}
                          </span>
                        )}
                      </div>
                      <span className="text-base font-black text-sky-800">
                        Total: ${Number(orderData.totalAmount).toFixed(2)}
                      </span>
                    </div>

                    {orderData.deliveryAddress && (
                      <p className="text-xs text-slate-600">
                        📍 <strong>Delivery Address:</strong> {orderData.deliveryAddress}
                      </p>
                    )}

                    {/* Items List */}
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                        Items Packed:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {orderData.items?.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white p-2 rounded-xl border border-sky-100 flex justify-between text-xs">
                            <span className="font-semibold text-slate-800">
                              {item.qty}x {item.title}
                            </span>
                            <span className="text-sky-600 font-bold">
                              ${(item.price * item.qty).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {orderData.customerNotes && (
                      <p className="text-xs italic text-slate-500 pt-1 border-t border-sky-100">
                        &ldquo;{orderData.customerNotes}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Body: Appointment Details */}
                {!isOrder && (
                  <div className="bg-sky-50/50 rounded-2xl p-3.5 border border-sky-100 mb-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">🏥 {b.services?.title}</span>
                      <span className="font-black text-emerald-600">${Number(b.services?.price).toFixed(2)}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500 font-medium">
                      <span>📅 {formatDate(b.booking_date)}</span>
                      <span>🕐 {formatTime(b.start_time)} – {formatTime(b.end_time)}</span>
                      <span>⏱ {b.services?.duration_minutes} mins</span>
                    </div>
                    {b.customer_notes && (
                      <p className="text-xs italic text-slate-500 pt-1 border-t border-sky-100">
                        &ldquo;{b.customer_notes}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {b.status !== 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(b, 'confirmed')}
                      disabled={isUpdating}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3.5 py-1.5 rounded-xl transition"
                    >
                      {isOrder ? '👨‍🍳 Accept & Pack' : '✅ Accept Appointment'}
                    </button>
                  )}

                  {b.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(b, 'completed')}
                      disabled={isUpdating}
                      className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold px-3.5 py-1.5 rounded-xl transition"
                    >
                      {isOrder ? '🛵 Mark Delivered' : '🏁 Mark Finished'}
                    </button>
                  )}

                  {b.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        if (confirm('Cancel this order/appointment?')) {
                          handleStatusChange(b, 'cancelled')
                        }
                      }}
                      disabled={isUpdating}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3.5 py-1.5 rounded-xl transition"
                    >
                      ❌ Cancel
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
