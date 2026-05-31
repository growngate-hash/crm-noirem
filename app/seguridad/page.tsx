import type { Metadata } from 'next'
import LegalLayout from '@/components/landing/LegalLayout'

export const metadata: Metadata = {
  title: 'Seguridad — SAFFI ERP',
  description: 'Cómo SAFFI protege tu negocio y los datos de tus clientes.',
}

export default function SeguridadPage() {
  return (
    <LegalLayout
      title="Política de Seguridad"
      subtitle="Cómo protegemos tu negocio y los datos de tus clientes con estándares de nivel empresarial."
      updated="30 de mayo de 2026"
      sections={[
        {
          id: 'compromiso',
          title: 'Nuestro Compromiso con la Seguridad',
          content: (
            <>
              <p>En SAFFI, la seguridad de los datos de tu negocio y de tus clientes es nuestra máxima prioridad. Gestionamos información sensible de operaciones de car wash y detailing, incluyendo datos de clientes, vehículos y transacciones financieras.</p>
              <div className="highlight">
                Nunca vendemos ni compartimos los datos de tu negocio con terceros con fines comerciales. Tus datos son tuyo — nosotros solo los custodiamos.
              </div>
              <p>Implementamos medidas de seguridad técnicas y organizativas conforme a los estándares actuales de la industria SaaS.</p>
            </>
          ),
        },
        {
          id: 'infraestructura',
          title: 'Infraestructura y Hosting',
          content: (
            <>
              <ul>
                <li><strong>Hosting:</strong> la plataforma se despliega sobre <strong>Vercel Edge Network</strong>, con nodos distribuidos globalmente para minimizar la latencia y maximizar la disponibilidad.</li>
                <li><strong>Base de datos:</strong> <strong>Supabase</strong> (PostgreSQL gestionado), desplegado sobre AWS con alta disponibilidad.</li>
                <li><strong>Backups:</strong> copias de seguridad automáticas diarias con retención de 30 días. Los planes Enterprise incluyen backups adicionales bajo demanda.</li>
                <li><strong>Disponibilidad:</strong> objetivo de uptime del 99.5% mensual. El estado del sistema está disponible en <a href="https://status.saffi.app" target="_blank" rel="noopener">status.saffi.app</a>.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'cifrado',
          title: 'Cifrado de Datos',
          content: (
            <>
              <h3>En tránsito</h3>
              <ul>
                <li>Todas las comunicaciones entre tu navegador/app y los servidores de SAFFI usan <strong>HTTPS con TLS 1.3</strong>.</li>
                <li>Los certificados SSL son gestionados automáticamente y renovados antes de su vencimiento.</li>
                <li>No se permiten conexiones sin cifrar (HTTP).</li>
              </ul>
              <h3>En reposo</h3>
              <ul>
                <li>Todos los datos almacenados en la base de datos están cifrados con <strong>AES-256</strong>.</li>
                <li>Las contraseñas de usuario nunca se almacenan en texto plano — se usa hashing seguro con bcrypt.</li>
                <li>Los datos de pago son gestionados exclusivamente por <strong>Stripe</strong> (certificación PCI DSS Level 1). SAFFI nunca almacena datos de tarjetas de crédito.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'autenticacion',
          title: 'Autenticación y Control de Acceso',
          content: (
            <>
              <ul>
                <li><strong>Autenticación segura:</strong> gestionada por Supabase Auth con tokens JWT de corta duración y refresh tokens rotados.</li>
                <li><strong>Contraseñas:</strong> mínimo 8 caracteres. Recomendamos el uso de gestores de contraseñas.</li>
                <li><strong>Sesiones:</strong> expiración automática por inactividad.</li>
                <li><strong>Row Level Security (RLS):</strong> aislamiento estricto de datos por tenant implementado a nivel de base de datos. Ningún usuario puede acceder a los datos de otro negocio, incluso en caso de error de aplicación.</li>
                <li><strong>Roles granulares:</strong> dentro de cada negocio, puedes asignar permisos específicos a cada miembro del equipo (Admin, Manager, Técnico, etc.).</li>
              </ul>
            </>
          ),
        },
        {
          id: 'pagos',
          title: 'Seguridad en Pagos',
          content: (
            <>
              <p>SAFFI utiliza <strong>Stripe</strong> para el procesamiento de pagos, uno de los proveedores más seguros del mundo:</p>
              <ul>
                <li>Certificación <strong>PCI DSS Level 1</strong> (el nivel más alto).</li>
                <li>Los datos de tarjetas de crédito nunca pasan por los servidores de SAFFI.</li>
                <li>Detección de fraude integrada mediante Stripe Radar.</li>
                <li>Autenticación 3D Secure cuando aplica.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'acceso-interno',
          title: 'Acceso Interno y Equipo',
          content: (
            <>
              <ul>
                <li>El acceso de empleados de SAFFI a los datos de producción está restringido al mínimo necesario (principio de mínimo privilegio).</li>
                <li>El acceso administrativo a la base de datos requiere autenticación de múltiples factores.</li>
                <li>Todos los accesos internos quedan registrados en logs de auditoría.</li>
                <li>El personal de soporte solo accede a los datos de un cliente con su consentimiento explícito y para resolver incidencias.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'incidentes',
          title: 'Gestión de Incidentes de Seguridad',
          content: (
            <>
              <p>En caso de detectarse una brecha de seguridad:</p>
              <ul>
                <li><strong>Tiempo de respuesta:</strong> evaluación inicial en menos de 4 horas.</li>
                <li><strong>Notificación:</strong> informaremos a los clientes afectados en un plazo máximo de 72 horas desde la detección, conforme a los requisitos legales aplicables.</li>
                <li><strong>Transparencia:</strong> publicaremos un informe post-incidente con las medidas adoptadas.</li>
                <li><strong>Remediación:</strong> implementaremos las correcciones necesarias para evitar recurrencias.</li>
              </ul>
              <div className="highlight">
                Para reportar una vulnerabilidad de seguridad, escríbenos a <a href="mailto:seguridad@saffi.app">seguridad@saffi.app</a>. Respondemos todas las comunicaciones en menos de 48 horas.
              </div>
            </>
          ),
        },
        {
          id: 'buenas-practicas',
          title: 'Buenas Prácticas para el Usuario',
          content: (
            <>
              <p>La seguridad es una responsabilidad compartida. Te recomendamos:</p>
              <ul>
                <li>Usar una contraseña única y robusta para tu cuenta SAFFI.</li>
                <li>No compartir tus credenciales con otras personas — cada usuario debe tener su propia cuenta.</li>
                <li>Cerrar sesión cuando uses dispositivos compartidos.</li>
                <li>Revocar el acceso de empleados que ya no formen parte de tu equipo desde Configuración → Equipo.</li>
                <li>Revisar periódicamente los permisos asignados a cada usuario.</li>
                <li>Notificarnos inmediatamente si sospechas que tu cuenta ha sido comprometida.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'cumplimiento',
          title: 'Cumplimiento Normativo',
          content: (
            <>
              <p>SAFFI cumple con las principales normativas de protección de datos aplicables a nuestros clientes:</p>
              <ul>
                <li><strong>RGPD / GDPR:</strong> para clientes en la Unión Europea.</li>
                <li><strong>LOPD-GDD:</strong> para clientes en España.</li>
                <li><strong>CCPA:</strong> para clientes en California (EE.UU.).</li>
              </ul>
              <p>Actualizamos continuamente nuestras prácticas de seguridad para adaptarnos a los cambios normativos y a la evolución del panorama de amenazas.</p>
            </>
          ),
        },
      ]}
    />
  )
}
