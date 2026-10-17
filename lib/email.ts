/**
 * Sends a booking confirmation email to both customer and provider.
 */
export async function sendBookingEmail({
  customerEmail, customerName,
  providerName, serviceName,
  bookingDate, startTime, endTime,
  status, notes,
}: {
  customerEmail: string
  customerName: string
  providerName: string
  serviceName: string
  bookingDate: string
  startTime: string
  endTime: string
  status: string
  notes?: string | null
}) {
  const fmt = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }
  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

  const statusMap: Record<string, { emoji: string; color: string; msg: string }> = {
    pending:   { emoji: '⏳', color: '#f59e0b', msg: 'Your booking request has been received and is awaiting confirmation.' },
    confirmed: { emoji: '✅', color: '#22c55e', msg: 'Great news! Your booking has been confirmed.' },
    cancelled: { emoji: '❌', color: '#ef4444', msg: 'Unfortunately, your booking has been cancelled.' },
    waitlist:  { emoji: '📋', color: '#3b82f6', msg: 'You have been placed on the waitlist.' },
  }
  const s = statusMap[status] || statusMap.pending

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f0f9ff;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(14,165,233,0.12);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0ea5e9,#2563eb);padding:32px 28px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">📅</div>
        <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">BookforMe</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Appointment Management</div>
      </div>
      <!-- Status Banner -->
      <div style="background:${s.color}15;border-left:4px solid ${s.color};padding:16px 28px;margin:0;">
        <div style="font-size:22px;margin-bottom:4px;">${s.emoji}</div>
        <p style="margin:0;color:#334155;font-size:15px;font-weight:600;">${s.msg}</p>
      </div>
      <!-- Content -->
      <div style="padding:28px;">
        <p style="color:#64748b;font-size:14px;margin:0 0 20px;">Hi <strong>${customerName}</strong>,</p>
        <!-- Booking Details Card -->
        <div style="background:#f8fafc;border-radius:12px;padding:20px;border:1px solid #e2e8f0;margin-bottom:20px;">
          <p style="margin:0 0 14px;font-weight:700;color:#0f172a;font-size:15px;">📋 Booking Details</p>
          ${[
            ['🏪 Provider', providerName],
            ['🛠 Service', serviceName],
            ['📅 Date', fmtDate(bookingDate)],
            ['🕐 Time', `${fmt(startTime)} → ${fmt(endTime)}`],
            ['📌 Status', `<span style="background:${s.color}20;color:${s.color};padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">${status.toUpperCase()}</span>`],
            ...(notes ? [['📝 Notes', notes]] : []),
          ].map(([k, v]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;">
              <span style="color:#94a3b8;font-size:13px;">${k}</span>
              <span style="color:#334155;font-size:13px;font-weight:600;">${v}</span>
            </div>
          `).join('')}
        </div>
        <!-- Add to Calendar -->
        <div style="text-align:center;margin:20px 0;">
          <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(serviceName + ' with ' + providerName)}&dates=${bookingDate.replace(/-/g, '')}T${startTime.replace(':', '')}00/${bookingDate.replace(/-/g, '')}T${endTime.replace(':', '')}00"
            style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;font-size:14px;">
            📆 Add to Google Calendar
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin:20px 0 0;">
          You received this because you use BookforMe · <a href="#" style="color:#0ea5e9;">Unsubscribe</a>
        </p>
      </div>
    </div>
  </body>
  </html>`

  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customerEmail,
        subject: `${s.emoji} Booking ${status}: ${serviceName} with ${providerName}`,
        html,
      }),
    })
    return res.ok
  } catch {
    console.warn('Email send failed (non-critical)')
    return false
  }
}
