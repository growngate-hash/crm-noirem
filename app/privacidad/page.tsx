import type { Metadata } from 'next'
import LegalLayout from '@/components/landing/LegalLayout'

export const metadata: Metadata = {
  title: 'Política de Privacidad — SAFFI ERP',
  description: 'Cómo SAFFI recopila, usa y protege tu información personal.',
}

export default function PrivacidadPage() {
  return (
    <LegalLayout
      title="Política de Privacidad"
      subtitle="Cómo recopilamos, usamos y protegemos tu información personal."
      updated="30 de mayo de 2026"
      sections={[
        {
          id: 'responsable',
          title: 'Responsable del Tratamiento',
          content: (
            <>
              <p><strong>SAFFI ERP</strong> (en adelante, "SAFFI", "nosotros" o "la empresa") es responsable del tratamiento de los datos personales que recopilamos a través de nuestra plataforma de gestión para negocios de car wash y detailing a domicilio, accesible en <strong>www.saffi.app</strong>.</p>
              <p>Para cualquier consulta relacionada con el tratamiento de tus datos personales, puedes contactarnos en:</p>
              <div className="highlight">
                <strong>Email:</strong> legal@saffi.app<br/>
                <strong>Dirección:</strong> SAFFI ERP · Operaciones Globales
              </div>
            </>
          ),
        },
        {
          id: 'datos-recopilados',
          title: 'Datos que Recopilamos',
          content: (
            <>
              <h3>Datos que tú nos proporcionas</h3>
              <ul>
                <li><strong>Datos de cuenta:</strong> nombre del negocio, correo electrónico, contraseña (cifrada), país.</li>
                <li><strong>Datos del negocio:</strong> nombre comercial, logo, servicios ofrecidos, tarifas e información de configuración.</li>
                <li><strong>Datos de facturación:</strong> información de pago procesada de forma segura a través de Stripe. SAFFI nunca almacena datos de tarjetas de crédito.</li>
                <li><strong>Datos operativos:</strong> clientes de tu negocio, reservas, vehículos, facturas e inventario que registras en la plataforma.</li>
              </ul>
              <h3>Datos que recopilamos automáticamente</h3>
              <ul>
                <li>Dirección IP y datos de navegación (páginas visitadas, tiempo de sesión).</li>
                <li>Tipo de dispositivo, sistema operativo y navegador.</li>
                <li>Datos de uso de la plataforma para mejorar la experiencia del usuario.</li>
                <li>Cookies técnicas y de análisis (ver Política de Cookies).</li>
              </ul>
            </>
          ),
        },
        {
          id: 'finalidades',
          title: 'Finalidades del Tratamiento',
          content: (
            <>
              <p>Tratamos tus datos para las siguientes finalidades:</p>
              <ul>
                <li><strong>Prestación del servicio:</strong> gestionar tu cuenta, procesar reservas, facturas e inventario dentro de la plataforma.</li>
                <li><strong>Gestión de pagos:</strong> procesar suscripciones y facturación a través de nuestro proveedor de pagos Stripe.</li>
                <li><strong>Comunicaciones del servicio:</strong> enviar confirmaciones de cuenta, notificaciones de trial, alertas de vencimiento y actualizaciones críticas del sistema.</li>
                <li><strong>Soporte técnico:</strong> resolver incidencias y atender solicitudes de ayuda.</li>
                <li><strong>Mejora del producto:</strong> analizar el uso de la plataforma para desarrollar nuevas funcionalidades.</li>
                <li><strong>Comunicaciones comerciales:</strong> enviar información sobre novedades y actualizaciones, siempre con tu consentimiento previo y posibilidad de darte de baja.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'base-legal',
          title: 'Base Legal del Tratamiento',
          content: (
            <>
              <ul>
                <li><strong>Ejecución contractual:</strong> el tratamiento es necesario para prestarte el servicio contratado.</li>
                <li><strong>Interés legítimo:</strong> para la seguridad, prevención de fraudes y mejora del servicio.</li>
                <li><strong>Consentimiento:</strong> para comunicaciones de marketing opcionales.</li>
                <li><strong>Obligación legal:</strong> cuando la normativa aplicable lo requiera.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'comparticion',
          title: 'Compartición de Datos con Terceros',
          content: (
            <>
              <p>SAFFI no vende ni alquila tus datos personales. Podemos compartir información con:</p>
              <ul>
                <li><strong>Stripe:</strong> proveedor de pagos, para procesar suscripciones y facturación.</li>
                <li><strong>Supabase:</strong> proveedor de infraestructura de base de datos y autenticación.</li>
                <li><strong>Vercel:</strong> proveedor de hosting de la aplicación.</li>
                <li><strong>Resend:</strong> proveedor de envío de correos electrónicos transaccionales.</li>
              </ul>
              <p>Todos los proveedores están sujetos a acuerdos de procesamiento de datos (DPA) y cumplen con los estándares de seguridad aplicables.</p>
              <div className="highlight">
                Nunca compartimos los datos de tus clientes (los que tú introduces en la plataforma) con terceros para fines publicitarios o comerciales.
              </div>
            </>
          ),
        },
        {
          id: 'conservacion',
          title: 'Conservación de Datos',
          content: (
            <>
              <ul>
                <li><strong>Datos de cuenta activa:</strong> mientras la relación contractual esté vigente.</li>
                <li><strong>Tras cancelación:</strong> conservamos los datos durante 90 días para permitir la reactivación o exportación. Pasado este plazo, los eliminamos de forma segura.</li>
                <li><strong>Datos de facturación:</strong> conservados 7 años por obligaciones fiscales y legales.</li>
                <li><strong>Logs de seguridad:</strong> conservados 12 meses.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'derechos',
          title: 'Tus Derechos',
          content: (
            <>
              <p>Tienes los siguientes derechos respecto a tus datos personales:</p>
              <ul>
                <li><strong>Acceso:</strong> solicitar una copia de los datos que tenemos sobre ti.</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
                <li><strong>Supresión:</strong> solicitar la eliminación de tus datos cuando ya no sean necesarios.</li>
                <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado y legible por máquina.</li>
                <li><strong>Oposición:</strong> oponerte al tratamiento basado en interés legítimo.</li>
                <li><strong>Limitación:</strong> solicitar la restricción del tratamiento en determinados supuestos.</li>
              </ul>
              <p>Para ejercer cualquiera de estos derechos, escríbenos a <a href="mailto:legal@saffi.app">legal@saffi.app</a>. Responderemos en un plazo máximo de 30 días.</p>
            </>
          ),
        },
        {
          id: 'seguridad',
          title: 'Seguridad de los Datos',
          content: (
            <>
              <p>SAFFI implementa medidas técnicas y organizativas para proteger tus datos:</p>
              <ul>
                <li>Cifrado en tránsito mediante TLS 1.3.</li>
                <li>Cifrado en reposo en todos los sistemas de almacenamiento.</li>
                <li>Autenticación segura gestionada por Supabase Auth.</li>
                <li>Aislamiento de datos por tenant (Row Level Security).</li>
                <li>Acceso limitado a los datos por parte del personal de SAFFI.</li>
                <li>Backups diarios automáticos.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'cambios',
          title: 'Cambios en esta Política',
          content: (
            <>
              <p>Podemos actualizar esta Política de Privacidad periódicamente. Cuando lo hagamos, te notificaremos por email y actualizaremos la fecha en la parte superior de este documento.</p>
              <p>Si los cambios son sustanciales, te solicitaremos tu consentimiento antes de que entren en vigor.</p>
            </>
          ),
        },
      ]}
    />
  )
}
