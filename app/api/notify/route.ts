import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { customerEmail, customerName, providerName, serviceName,
            bookingDate, bookingTime, status, newDate, newTime } = await request.json()

    const statusMessages: Record<string, { subject: string; color: string; message: string }> = {
      confirmed:   { subject: 'Booking Confirmed - BookIt',      color: '#22c55e', message: 'Your appointment has been <strong>confirmed</strong>! See you there.' },
      cancelled:   { subject: 'Booking Cancelled - BookIt',      color: '#ef4444', message: 'Your appointment has been <strong>cancelled</strong> by the provider.' },
      pending:     { subject: 'Booking On Waitlist - BookIt',    color: '#f59e0b', message: 'You are on the <strong>waitlist</strong>. The provider will confirm soon.' },
      rescheduled: { subject: 'Appointment Rescheduled - BookIt',color: '#8b5cf6', message: 'Your appointment has been <strong>rescheduled</strong> to a new time.' },
    }

    const info = statusMessages[status] || statusMessages.confirmed

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#1e1b4b;color:#fff;padding:32px;border-radius:16px;">
        <h1 style="color:#a78bfa;margin-bottom:4px;font-size:24px;">📅 BookIt</h1>
        <p style="color:rgba(255,255,255,0.5);margin-top:0;font-size:14px;">Appointment Update</p>
        <div style="background:${info.color}22;border:1px solid ${info.color}55;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0;font-size:15px;">${info.message}</p>
        </div>
        <p style="color:rgba(255,255,255,0.8);">Hi <strong>${customerName}</strong>,</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0;font-size:14px;width:40%;">Provider</td><td style="font-weight:bold;font-size:14px;">${providerName}</td></tr>
          <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0;font-size:14px;">Service</td><td style="font-size:14px;">${serviceName}</td></tr>
          <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0;font-size:14px;">${status === 'rescheduled' ? 'New Date' : 'Date'}</td><td style="font-size:14px;">${status === 'rescheduled' ? newDate : bookingDate}</td></tr>
          <tr><td style="color:rgba(255,255,255,0.5);padding:8px 0;font-size:14px;">${status === 'rescheduled' ? 'New Time' : 'Time'}</td><td style="color:#a78bfa;font-weight:bold;font-size:14px;">${status === 'rescheduled' ? newTime : bookingTime}</td></tr>
        </table>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/customer" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:16px;">
          View My Appointments →
        </a>
        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:24px;">Sent by BookIt. Do not reply to this email.</p>
      </div>
    `

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"BookIt" <${process.env.GMAIL_USER}>`,
      to: customerEmail,
      subject: info.subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Email error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
