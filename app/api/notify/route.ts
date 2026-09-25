import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { customerEmail, customerName, providerName, serviceName,
            bookingDate, bookingTime, status, newDate, newTime } = await request.json()

    const statusMessages: Record<string, { subject: string; color: string; message: string }> = {
      confirmed: {
        subject: '✅ Booking Confirmed!',
        color: '#22c55e',
        message: `Your appointment has been <strong>confirmed</strong>. See you there!`,
      },
      cancelled: {
        subject: '❌ Booking Cancelled',
        color: '#ef4444',
        message: `Unfortunately, your appointment has been <strong>cancelled</strong> by the provider.`,
      },
      pending: {
        subject: '⏳ Booking On Waitlist',
        color: '#f59e0b',
        message: `Your appointment has been placed on the <strong>waitlist</strong>. The provider will confirm soon.`,
      },
      rescheduled: {
        subject: '🗓️ Appointment Rescheduled',
        color: '#8b5cf6',
        message: `Your appointment has been <strong>rescheduled</strong> to a new time.`,
      },
    }

    const info = statusMessages[status] || statusMessages.confirmed

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #0f0f1a; color: #ffffff; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
            
            <h1 style="font-size: 28px; margin-bottom: 8px;">📅 BookIt</h1>
            <p style="color: rgba(255,255,255,0.5); margin-top: 0;">Appointment Update</p>

            <div style="background: ${info.color}22; border: 1px solid ${info.color}44; border-radius: 12px; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; font-size: 16px;">${info.message}</p>
            </div>

            <p style="color: rgba(255,255,255,0.7);">Hi <strong>${customerName}</strong>,</p>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="color: rgba(255,255,255,0.5); padding: 8px 0; font-size: 14px;">Provider</td>
                <td style="color: #ffffff; font-weight: bold; font-size: 14px;">${providerName}</td>
              </tr>
              <tr>
                <td style="color: rgba(255,255,255,0.5); padding: 8px 0; font-size: 14px;">Service</td>
                <td style="color: #ffffff; font-size: 14px;">${serviceName}</td>
              </tr>
              <tr>
                <td style="color: rgba(255,255,255,0.5); padding: 8px 0; font-size: 14px;">
                  ${status === 'rescheduled' ? 'New Date' : 'Date'}
                </td>
                <td style="color: #ffffff; font-size: 14px;">
                  ${status === 'rescheduled' ? newDate : bookingDate}
                </td>
              </tr>
              <tr>
                <td style="color: rgba(255,255,255,0.5); padding: 8px 0; font-size: 14px;">
                  ${status === 'rescheduled' ? 'New Time' : 'Time'}
                </td>
                <td style="color: #a78bfa; font-weight: bold; font-size: 14px;">
                  ${status === 'rescheduled' ? newTime : bookingTime}
                </td>
              </tr>
            </table>

            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer"
              style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 16px;">
              View My Appointments →
            </a>

            <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin-top: 24px;">
              This is an automated message from BookIt. Please do not reply.
            </p>
          </div>
        </body>
      </html>
    `

    const { error } = await resend.emails.send({
      from: 'BookIt <onboarding@resend.dev>',
      to: [customerEmail],
      subject: info.subject,
      html,
    })

    if (error) {
      console.error('Email error:', error)
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notify error:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
