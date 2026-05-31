import type { Metadata } from 'next'
import LegalLayout from '@/components/landing/LegalLayout'

export const metadata: Metadata = {
  title: 'Términos de Uso — SAFFI ERP',
  description: 'Condiciones que rigen el uso de la plataforma SAFFI ERP.',
}

export default function TerminosPage() {
  return (
    <LegalLayout
      title="Términos de Uso"
      subtitle="Condiciones que regulan el acceso y uso de la plataforma SAFFI ERP."
      updated="30 de mayo de 2026"
      sections={[
        {
          id: 'aceptacion',
          title: 'Aceptación de los Términos',
          content: (
            <>
              <p>Al registrarte en SAFFI ERP y acceder a la plataforma, aceptas estos Términos de Uso en su totalidad. Si no estás de acuerdo con alguna de las condiciones aquí establecidas, no debes utilizar el servicio.</p>
              <p>Estos términos constituyen un contrato vinculante entre tú (en adelante, "el Usuario" o "el Cliente") y <strong>SAFFI ERP</strong> (en adelante, "SAFFI").</p>
              <div className="highlight">
                El uso continuado del servicio tras la publicación de actualizaciones implica la aceptación de los nuevos términos.
              </div>
            </>
          ),
        },
        {
          id: 'descripcion',
          title: 'Descripción del Servicio',
          content: (
            <>
              <p>SAFFI es un software ERP (Enterprise Resource Planning) vertical especializado en negocios de <strong>car wash y detailing a domicilio</strong>. La plataforma ofrece:</p>
              <ul>
                <li>Gestión de reservas y agenda de servicios.</li>
                <li>CRM de clientes y vehículos.</li>
                <li>Facturación y control financiero.</li>
                <li>Gestión de inventario y compras.</li>
                <li>Reportes y analytics del negocio.</li>
                <li>Gestión de equipos y roles de usuario.</li>
              </ul>
              <p>SAFFI se ofrece como Software as a Service (SaaS) bajo modalidad de suscripción mensual o anual.</p>
            </>
          ),
        },
        {
          id: 'cuenta',
          title: 'Registro y Cuenta de Usuario',
          content: (
            <>
              <ul>
                <li>Para usar SAFFI debes registrarte con información veraz, completa y actualizada.</li>
                <li>Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades realizadas bajo tu cuenta.</li>
                <li>Debes notificarnos inmediatamente ante cualquier uso no autorizado de tu cuenta enviando un email a <a href="mailto:legal@saffi.app">legal@saffi.app</a>.</li>
                <li>Cada tenant (negocio) opera en un entorno aislado. Los datos de un negocio son inaccesibles para otros usuarios.</li>
                <li>No está permitido compartir credenciales entre personas. Cada usuario debe tener su propia cuenta dentro del plan contratado.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'trial',
          title: 'Período de Prueba Gratuita',
          content: (
            <>
              <p>SAFFI ofrece un período de prueba gratuita de <strong>10 días</strong> con acceso completo a todas las funcionalidades del plan seleccionado.</p>
              <ul>
                <li>No se requiere tarjeta de crédito para iniciar el trial.</li>
                <li>Al finalizar el período de prueba, el acceso se suspende automáticamente hasta que se active una suscripción de pago.</li>
                <li>Los datos introducidos durante el trial se conservan durante 30 días adicionales tras la expiración.</li>
                <li>SAFFI se reserva el derecho de modificar las condiciones del trial en cualquier momento.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'pagos',
          title: 'Suscripción y Pagos',
          content: (
            <>
              <h3>Planes disponibles</h3>
              <p>SAFFI ofrece tres planes de suscripción: <strong>Starter</strong> ($49/mes), <strong>Pro</strong> ($99/mes) y <strong>Enterprise</strong> ($199/mes), con descuento del 20% en modalidad anual.</p>
              <h3>Facturación</h3>
              <ul>
                <li>Los pagos se procesan de forma recurrente (mensual o anual) a través de <strong>Stripe</strong>.</li>
                <li>La suscripción se renueva automáticamente al final de cada período.</li>
                <li>Puedes cancelar en cualquier momento desde la sección Configuración → Planes de tu cuenta.</li>
              </ul>
              <h3>Política de reembolsos</h3>
              <ul>
                <li>Los primeros 7 días tras la activación de cualquier plan de pago son elegibles para reembolso completo.</li>
                <li>Pasado ese período, no se realizan reembolsos por el período en curso.</li>
                <li>En caso de cancelación, el acceso continúa hasta el final del período pagado.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'uso-aceptable',
          title: 'Uso Aceptable',
          content: (
            <>
              <p>Queda expresamente prohibido:</p>
              <ul>
                <li>Usar la plataforma para actividades ilegales o fraudulentas.</li>
                <li>Intentar acceder a datos de otros tenants o usuarios.</li>
                <li>Realizar ingeniería inversa o intentar extraer el código fuente de la aplicación.</li>
                <li>Usar bots, scrapers u otros medios automatizados no autorizados para acceder a la plataforma.</li>
                <li>Introducir malware, virus u otro software malicioso.</li>
                <li>Revender o sublicenciar el acceso a SAFFI a terceros.</li>
                <li>Usar el servicio de forma que afecte a su disponibilidad o rendimiento para otros usuarios.</li>
              </ul>
              <p>El incumplimiento de estas normas puede resultar en la suspensión inmediata de la cuenta sin derecho a reembolso.</p>
            </>
          ),
        },
        {
          id: 'propiedad',
          title: 'Propiedad Intelectual',
          content: (
            <>
              <p>Todo el contenido, código, diseño, marcas y funcionalidades de SAFFI son propiedad exclusiva de SAFFI ERP o de sus licenciantes, y están protegidos por las leyes de propiedad intelectual aplicables.</p>
              <p><strong>Tus datos son tuyos:</strong> SAFFI no reclama ningún derecho de propiedad sobre los datos que introduces en la plataforma (clientes, reservas, facturas, etc.). Puedes exportarlos en cualquier momento.</p>
              <p>Al usar SAFFI, nos otorgas únicamente los permisos necesarios para prestarte el servicio descrito en estos términos.</p>
            </>
          ),
        },
        {
          id: 'disponibilidad',
          title: 'Disponibilidad y SLA',
          content: (
            <>
              <p>SAFFI se compromete a mantener una disponibilidad mínima del <strong>99.5%</strong> mensual, excluyendo ventanas de mantenimiento programadas (comunicadas con al menos 24 horas de antelación) y causas de fuerza mayor.</p>
              <ul>
                <li>Los planes Enterprise incluyen SLA garantizado por contrato.</li>
                <li>SAFFI se reserva el derecho de realizar mantenimientos que puedan interrumpir temporalmente el servicio.</li>
                <li>No nos responsabilizamos por interrupciones causadas por terceros (proveedores de hosting, Internet, etc.).</li>
              </ul>
            </>
          ),
        },
        {
          id: 'limitacion',
          title: 'Limitación de Responsabilidad',
          content: (
            <>
              <p>En la máxima medida permitida por la ley aplicable:</p>
              <ul>
                <li>SAFFI no será responsable por pérdidas de negocio, lucro cesante, daños indirectos o consecuentes derivados del uso o imposibilidad de uso del servicio.</li>
                <li>La responsabilidad total de SAFFI en ningún caso excederá el importe pagado por el Cliente en los 12 meses anteriores al evento que da lugar a la reclamación.</li>
                <li>SAFFI no garantiza que el servicio esté libre de errores o que satisfaga todos los requisitos del Cliente.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'rescision',
          title: 'Rescisión del Contrato',
          content: (
            <>
              <p><strong>Por el Cliente:</strong> puedes cancelar tu suscripción en cualquier momento desde la plataforma. La cancelación es efectiva al final del período de facturación en curso.</p>
              <p><strong>Por SAFFI:</strong> nos reservamos el derecho de suspender o cancelar cuentas que incumplan estos términos, con o sin previo aviso, según la gravedad del incumplimiento.</p>
              <p>Tras la cancelación, tienes 90 días para exportar tus datos. Pasado ese plazo, los datos se eliminan de forma permanente.</p>
            </>
          ),
        },
        {
          id: 'ley-aplicable',
          title: 'Ley Aplicable y Jurisdicción',
          content: (
            <>
              <p>Estos Términos de Uso se rigen por las leyes aplicables en el domicilio legal de SAFFI ERP. Cualquier controversia que no pueda resolverse mediante negociación amistosa se someterá a los tribunales competentes.</p>
              <p>Para clientes ubicados en la Unión Europea, son de aplicación las disposiciones del RGPD y demás normativa europea de protección de datos.</p>
            </>
          ),
        },
      ]}
    />
  )
}
