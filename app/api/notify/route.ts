import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function GET() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  const isConfigured = Boolean(user && pass && pass !== 'xxxx xxxx xxxx xxxx' && !user.includes('your_gmail'))

  return NextResponse.json({
    status: isConfigured ? 'ready' : 'simulated',
    gmailUser: isConfigured ? user : null,
    message: isConfigured
      ? 'Gmail SMTP is fully configured'
      : 'Running in simulated email mode. Set real GMAIL_USER and GMAIL_APP_PASSWORD in .env.local to send live emails.',
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      to,
      subject,
      html,
      // Alternative high-level format:
      customerEmail,
      customerName = 'Customer',
      providerName = 'Your Provider',
      serviceName = 'Appointment Service',
      bookingDate = '',
      bookingTime = '',
      status = 'confirmed',
      newDate,
      newTime,
      notes,
    } = body

    const recipient = to || customerEmail

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient email is required (use "to" or "customerEmail")' },
        { status: 400 }
      )
    }

    const emailStatus = status.toLowerCase()
    const statusMap: Record<string, { emoji: string; color: string; label: string; msg: string }> = {
      pending: {
        emoji: '⏳',
        color: '#f59e0b',
        label: 'Booking Request Received',
        msg: 'Your booking request has been submitted and is waiting for provider confirmation.',
      },
      confirmed: {
        emoji: '✅',
        color: '#10b981',
        label: 'Booking Confirmed!',
        msg: 'Great news! Your appointment has been confirmed by the provider.',
      },
      cancelled: {
        emoji: '❌',
        color: '#ef4444',
        label: 'Booking Cancelled',
        msg: 'Your booking has been cancelled or rejected.',
      },
      rescheduled: {
        emoji: '🗓️',
        color: '#0284c7',
        label: 'Booking Rescheduled',
        msg: `Your appointment has been rescheduled${newDate ? ` to ${newDate} at ${newTime}` : ''}.`,
      },
    }

    const s = statusMap[emailStatus] || statusMap.pending

    const emailSubject = subject || `${s.emoji} ${s.label}: ${serviceName} with ${providerName}`

    const displayDate = newDate || bookingDate
    const displayTime = newTime || bookingTime

    const cleanDate = displayDate.replace(/[^0-9]/g, '')
    const cleanTime = displayTime.replace(/[^0-9]/g, '').slice(0, 4)
    const calDatePart = cleanDate.length === 8 ? cleanDate : '20261018'
    const calTimePart = cleanTime.length === 4 ? cleanTime : '1000'
    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      serviceName + ' with ' + providerName
    )}&dates=${calDatePart}T${calTimePart}00/${calDatePart}T${calTimePart}00&details=${encodeURIComponent(
      'Booked via BookIt platform.\nProvider: ' + providerName
    )}`

    const emailHtml =
      html ||
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${emailSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(14,165,233,0.15);border:1px solid #e0f2fe;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0284c7,#2563eb);padding:36px 32px;text-align:center;">
      <div style="font-size:42px;line-height:1;margin-bottom:8px;">📅</div>
      <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">BookIt</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">Smart Appointment & Shopping Platform</div>
    </div>

    <!-- Status Banner -->
    <div style="background:${s.color}15;border-left:5px solid ${s.color};padding:18px 32px;">
      <div style="font-size:20px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:8px;">
        ${s.emoji} ${s.label}
      </div>
      <p style="margin:4px 0 0;color:#475569;font-size:14px;line-height:1.5;">${s.msg}</p>
    </div>

    <!-- Main Content -->
    <div style="padding:32px;">
      <p style="color:#334155;font-size:15px;margin:0 0 20px;">
        Hello <strong>${customerName}</strong>,
      </p>

      <!-- Details Card -->
      <div style="background:#f8fafc;border-radius:16px;padding:20px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <p style="margin:0 0 14px;font-weight:800;color:#0f172a;font-size:15px;text-transform:uppercase;letter-spacing:0.5px;">
          📋 Appointment Details
        </p>

        <div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;font-size:13px;">🏪 Provider</span>
          <span style="color:#0f172a;font-size:13px;font-weight:700;">${providerName}</span>
        </div>

        <div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e2e8f0;">
          <span style="color:#64748b;font-size:13px;">🛠 Service</span>
          <span style="color:#0284c7;font-size:13px;font-weight:700;">${serviceName}</span>
        </div>

        ${
          displayDate
            ? `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e2e8f0;">
                <span style="color:#64748b;font-size:13px;">📅 Date</span>
                <span style="color:#0f172a;font-size:13px;font-weight:700;">${displayDate}</span>
              </div>`
            : ''
        }

        ${
          displayTime
            ? `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e2e8f0;">
                <span style="color:#64748b;font-size:13px;">🕐 Time</span>
                <span style="color:#0f172a;font-size:13px;font-weight:700;">${displayTime}</span>
              </div>`
            : ''
        }

        <div style="display:flex;justify-content:space-between;padding:9px 0;">
          <span style="color:#64748b;font-size:13px;">📌 Status</span>
          <span style="background:${s.color}20;color:${s.color};padding:3px 12px;border-radius:20px;font-size:12px;font-weight:800;">
            ${s.label}
          </span>
        </div>

        ${
          notes
            ? `<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #cbd5e1;font-size:12px;color:#64748b;">
                <strong>Notes:</strong> ${notes}
              </div>`
            : ''
        }
      </div>

      <!-- Add to Google Calendar CTA -->
      <div style="text-align:center;margin:28px 0 20px;">
        <a href="${calUrl}" target="_blank"
          style="display:inline-block;background:linear-gradient(135deg,#0284c7,#2563eb);color:#ffffff;font-weight:800;padding:14px 32px;border-radius:14px;text-decoration:none;font-size:14px;box-shadow:0 6px 20px rgba(2,132,199,0.35);">
          📆 Add to Google Calendar
        </a>
      </div>

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0;line-height:1.5;">
        You received this notification from BookIt Platform.<br>
        Questions? Reply to this email or contact ${providerName}.
      </p>
    </div>
  </div>
</body>
</html>
`

    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD
    const isRealGmail = Boolean(
      user && pass && pass !== 'xxxx xxxx xxxx xxxx' && !user.includes('your_gmail')
    )

    if (isRealGmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user, pass },
        })

        await transporter.verify()
        const info = await transporter.sendMail({
          from: `"BookIt 📅" <${user}>`,
          to: recipient,
          subject: emailSubject,
          html: emailHtml,
        })

        console.log('✅ Real email sent to', recipient, 'MessageId:', info.messageId)
        return NextResponse.json({ success: true, messageId: info.messageId, mode: 'smtp' })
      } catch (smtpErr: unknown) {
        const errMsg = smtpErr instanceof Error ? smtpErr.message : 'SMTP failed'
        console.warn('⚠️ SMTP send error, falling back to simulated mode:', errMsg)
      }
    }

    // Fallback: simulated / test logger mode (never breaks the UI)
    console.log(`[EMAIL SIMULATED] To: ${recipient} | Subject: "${emailSubject}"`)
    return NextResponse.json({
      success: true,
      mode: 'simulated',
      recipient,
      subject: emailSubject,
      note: 'Email logged in dev mode. To send live emails to inbox, enter your Gmail & 16-character App Password in .env.local',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Notify route error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
