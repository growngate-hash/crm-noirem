import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type EmailTemplate = 'welcome' | 'invite' | 'trial_expiring' | 'trial_expired'

interface SendEmailOptions {
  to: string
  template: EmailTemplate
  data?: Record<string, string>
}

// Genera el HTML según el template
function buildEmail(template: EmailTemplate, data: Record<string, string> = {}): {
  subject: string
  html: string
} {
  const logo = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="vertical-align: middle;">
          <svg width="22" height="36" viewBox="-25 -50 50 100">
            <path d="M 0 -45 C 3 -15, 7 -7, 24 0 C 7 7, 3 15, 0 45 C -3 15, -7 7, -24 0 C -7 -7, -3 -15, 0 -45 Z" fill="#0B2A4A"/>
            <path d="M 0 -18 C 1.5 -6, 3 -2, 10 0 C 3 2, 1.5 6, 0 18 C -1.5 6, -3 2, -10 0 C -3 -2, -1.5 -6, 0 -18 Z" fill="#3DD9D6"/>
          </svg>
        </td>
        <td style="padding-left: 10px; font-family: 'Geist', -apple-system, sans-serif; font-size: 22px; font-weight: 500; color: #0B2A4A; letter-spacing: -0.04em; vertical-align: middle;">
          saffi
        </td>
      </tr>
    </table>
  `

  const footer = `
    <tr>
      <td style="padding: 22px 36px; background: #0B2A4A;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="vertical-align: middle;">
              <div style="font-family: monospace; font-size: 10px; color: #3DD9D6; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">Saffi</div>
              <div style="font-size: 12px; color: #B8D4ED;">Car Wash &amp; Detailing ERP</div>
            </td>
            <td style="text-align: right; vertical-align: middle; font-size: 11px; color: #B8D4ED;">
              <a href="https://saffi.app" style="color: #B8D4ED; text-decoration: none;">saffi.app</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `

  const wrapper = (content: string) => `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background: #f5f4ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f5f4ef; padding: 32px 16px;">
        <tr><td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 24px rgba(11,42,74,0.08);">
            <tr>
              <td style="padding: 28px 36px 24px; border-bottom: 1px solid #F0EFEA;">
                ${logo}
              </td>
            </tr>
            ${content}
            ${footer}
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; padding: 18px 0;">
            <tr>
              <td style="text-align: center; font-size: 11px; color: #A8A6A0; line-height: 1.6;">
                Si no esperabas este email, puedes ignorarlo.
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `

  if (template === 'welcome') {
    return {
      subject: 'Confirma tu cuenta · Saffi',
      html: wrapper(`
        <tr><td style="padding: 36px 36px 12px;">
          <div style="display: inline-block; background: #E6F5EC; color: #1F8F5C; padding: 5px 12px; border-radius: 100px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">● Prueba gratuita · 10 días</div>
          <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 500; color: #0B2A4A; letter-spacing: -0.025em;">Bienvenido a Saffi.<br>Solo falta confirmar tu cuenta.</h1>
          <p style="margin: 0; font-size: 15px; line-height: 1.55; color: #5A5852;">Haz clic en el botón de abajo para activar tu cuenta y empezar tu prueba gratuita de 10 días.</p>
        </td></tr>
        <tr><td style="padding: 28px 36px 36px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="background: #F5B544; border-radius: 8px;">
              <a href="${data.url}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #1A1A1A; text-decoration: none;">Confirmar mi cuenta →</a>
            </td></tr>
          </table>
        </td></tr>
      `)
    }
  }

  if (template === 'invite') {
    return {
      subject: 'Te invitaron a unirte al equipo en Saffi',
      html: wrapper(`
        <tr><td style="padding: 36px 36px 12px;">
          <div style="display: inline-block; background: #ECE6FA; color: #7B61D9; padding: 5px 12px; border-radius: 100px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">● Invitación de equipo</div>
          <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 500; color: #0B2A4A; letter-spacing: -0.025em;">Te invitaron a unirte al equipo en Saffi.</h1>
          <p style="margin: 0; font-size: 15px; line-height: 1.55; color: #5A5852;">Acepta la invitación para acceder al sistema. El enlace expira en 24 horas.</p>
        </td></tr>
        <tr><td style="padding: 28px 36px 36px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="background: #F5B544; border-radius: 8px;">
              <a href="${data.url}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #1A1A1A; text-decoration: none;">Aceptar invitación →</a>
            </td></tr>
          </table>
        </td></tr>
      `)
    }
  }

  if (template === 'trial_expiring') {
    const days = data.days ?? '3'
    return {
      subject: `Tu prueba gratuita expira en ${days} días · Saffi`,
      html: wrapper(`
        <tr><td style="padding: 36px 36px 12px;">
          <div style="display: inline-block; background: #FDF4DE; color: #F5B544; padding: 5px 12px; border-radius: 100px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">⚠ Trial expira en ${days} días</div>
          <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 500; color: #0B2A4A; letter-spacing: -0.025em;">Tu prueba gratuita está por terminar.</h1>
          <p style="margin: 0; font-size: 15px; line-height: 1.55; color: #5A5852;">Te quedan <strong>${days} días</strong> de acceso completo a Saffi. Para continuar sin interrupciones, activa tu plan.</p>
        </td></tr>
        <tr><td style="padding: 28px 36px 36px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="background: #F5B544; border-radius: 8px;">
              <a href="https://saffi.app/upgrade" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #1A1A1A; text-decoration: none;">Activar mi plan →</a>
            </td></tr>
          </table>
        </td></tr>
      `)
    }
  }

  if (template === 'trial_expired') {
    return {
      subject: 'Tu prueba gratuita ha expirado · Saffi',
      html: wrapper(`
        <tr><td style="padding: 36px 36px 12px;">
          <div style="display: inline-block; background: #FBE7E2; color: #D9533D; padding: 5px 12px; border-radius: 100px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">● Trial expirado</div>
          <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 500; color: #0B2A4A; letter-spacing: -0.025em;">Tu prueba gratuita ha terminado.</h1>
          <p style="margin: 0; font-size: 15px; line-height: 1.55; color: #5A5852;">Tu acceso a Saffi ha sido pausado. Activa tu plan para retomar la operación de tu negocio.</p>
        </td></tr>
        <tr><td style="padding: 28px 36px 36px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="background: #F5B544; border-radius: 8px;">
              <a href="https://saffi.app/upgrade" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #1A1A1A; text-decoration: none;">Activar mi plan →</a>
            </td></tr>
          </table>
        </td></tr>
      `)
    }
  }

  return { subject: 'Saffi', html: '' }
}

export async function sendEmail({ to, template, data }: SendEmailOptions) {
  const { subject, html } = buildEmail(template, data)

  const { data: result, error } = await resend.emails.send({
    from: 'Saffi <hola@saffi.app>',
    to,
    subject,
    html,
  })

  if (error) {
    console.error('[sendEmail] error:', error)
    return { ok: false, error }
  }

  return { ok: true, id: result?.id }
}