import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmailAlert(
  to: string,
  subject: string,
  html: string
) {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'MyFlights <noreply@myflights.app>',
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('Email send error:', err)
  }
}
