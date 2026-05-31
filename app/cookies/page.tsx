import type { Metadata } from 'next'
import LegalLayout from '@/components/landing/LegalLayout'

export const metadata: Metadata = {
  title: 'Política de Cookies — SAFFI ERP',
  description: 'Información sobre las cookies que utiliza la plataforma SAFFI ERP.',
}

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Política de Cookies"
      subtitle="Qué cookies usamos, para qué y cómo puedes gestionarlas."
      updated="30 de mayo de 2026"
      sections={[
        {
          id: 'que-son',
          title: '¿Qué son las Cookies?',
          content: (
            <>
              <p>Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (ordenador, tablet o móvil) cuando visitas un sitio web. Permiten que el sitio recuerde tus acciones y preferencias durante un período de tiempo.</p>
              <p>SAFFI utiliza cookies propias y de terceros para garantizar el funcionamiento correcto de la plataforma, analizar el uso del servicio y mejorar la experiencia de usuario.</p>
            </>
          ),
        },
        {
          id: 'tipos',
          title: 'Tipos de Cookies que Usamos',
          content: (
            <>
              <h3>Cookies estrictamente necesarias</h3>
              <p>Son indispensables para el funcionamiento de la plataforma. Sin ellas, la aplicación no puede funcionar correctamente. No requieren tu consentimiento.</p>
              <ul>
                <li><strong>sb-access-token / sb-refresh-token:</strong> gestión de sesión autenticada (Supabase Auth). Duración: sesión / 7 días.</li>
                <li><strong>__stripe_mid / __stripe_sid:</strong> prevención de fraude en pagos (Stripe). Duración: 1 año / sesión.</li>
                <li><strong>saffi-landing-lang:</strong> preferencia de idioma (ES/EN) de la página pública. Duración: 1 año.</li>
              </ul>

              <h3>Cookies de análisis y rendimiento</h3>
              <p>Nos ayudan a entender cómo los usuarios interactúan con la plataforma para mejorar el servicio. Requieren tu consentimiento.</p>
              <ul>
                <li><strong>Vercel Analytics:</strong> métricas anónimas de rendimiento y uso de la aplicación. No identifica a usuarios individuales. Duración: sesión.</li>
              </ul>

              <h3>Cookies de preferencias</h3>
              <p>Recuerdan configuraciones que has elegido para personalizar tu experiencia.</p>
              <ul>
                <li><strong>saffi-landing-lang:</strong> idioma seleccionado en la web pública. Duración: 1 año.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'terceros',
          title: 'Cookies de Terceros',
          content: (
            <>
              <p>Algunos proveedores externos con los que trabajamos pueden establecer sus propias cookies:</p>
              <ul>
                <li><strong>Stripe:</strong> prevención de fraude y procesamiento seguro de pagos. <a href="https://stripe.com/cookie-settings" target="_blank" rel="noopener">Política de cookies de Stripe →</a></li>
                <li><strong>Supabase:</strong> autenticación y gestión de sesiones. <a href="https://supabase.com/privacy" target="_blank" rel="noopener">Política de privacidad de Supabase →</a></li>
                <li><strong>Vercel:</strong> hosting y analytics de rendimiento. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener">Política de Vercel →</a></li>
              </ul>
              <div className="highlight">
                SAFFI no utiliza cookies de redes sociales ni cookies de publicidad comportamental de terceros.
              </div>
            </>
          ),
        },
        {
          id: 'duracion',
          title: 'Duración de las Cookies',
          content: (
            <>
              <p>Según su duración, las cookies pueden ser:</p>
              <ul>
                <li><strong>Cookies de sesión:</strong> se eliminan automáticamente cuando cierras el navegador.</li>
                <li><strong>Cookies persistentes:</strong> permanecen en tu dispositivo hasta que expiran o las eliminas manualmente. En SAFFI, ninguna cookie persistente supera los 12 meses.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'gestion',
          title: 'Cómo Gestionar las Cookies',
          content: (
            <>
              <p>Puedes gestionar o eliminar las cookies en cualquier momento desde la configuración de tu navegador:</p>
              <ul>
                <li><strong>Google Chrome:</strong> Configuración → Privacidad y seguridad → Cookies.</li>
                <li><strong>Mozilla Firefox:</strong> Opciones → Privacidad y seguridad → Cookies.</li>
                <li><strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web.</li>
                <li><strong>Microsoft Edge:</strong> Configuración → Privacidad → Cookies.</li>
              </ul>
              <div className="highlight">
                <strong>Importante:</strong> deshabilitar las cookies estrictamente necesarias puede impedir el correcto funcionamiento de la plataforma, incluyendo el inicio de sesión y la gestión de tu cuenta.
              </div>
            </>
          ),
        },
        {
          id: 'actualizaciones',
          title: 'Actualizaciones de esta Política',
          content: (
            <>
              <p>Podemos actualizar esta Política de Cookies para reflejar cambios en el uso de cookies o en la normativa aplicable. Te notificaremos por email o mediante un aviso en la plataforma cuando realicemos cambios significativos.</p>
              <p>Si tienes preguntas sobre el uso de cookies, contacta con nosotros en <a href="mailto:legal@saffi.app">legal@saffi.app</a>.</p>
            </>
          ),
        },
      ]}
    />
  )
}
