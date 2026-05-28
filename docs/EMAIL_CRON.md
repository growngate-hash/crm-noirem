# Emails transaccionales y Cron Jobs

## 1. Stack

| Componente | Tecnología |
|---|---|
| Envío de emails | [Resend](https://resend.com) (`resend` v6) |
| Templates | HTML inline en `utils/sendEmail.ts` |
| Scheduling | Vercel Cron Jobs (`vercel.json`) |
| Deduplicación | Tabla `email_queue` en Supabase |

**Variables de entorno requeridas:**

| Variable | Descripción |
|---|---|
| `RESEND_API_KEY` | API key de Resend |
| `CRON_SECRET` | Token secreto para autenticar llamadas del cron |

---

## 2. `utils/sendEmail.ts` — función central de envío

```typescript
import { sendEmail } from '@/utils/sendEmail'

await sendEmail({
  to: 'cliente@example.com',
  template: 'welcome',
  data: { url: 'https://...' },
})
// Retorna: { ok: true, id: 'resend-id' } | { ok: false, error }
```

### Templates disponibles

| Template | Subject | `data` requerido | Uso |
|---|---|---|---|
| `welcome` | Confirma tu cuenta · Saffi | `{ url }` | Confirmación de registro |
| `invite` | Te invitaron a unirte al equipo en Saffi | `{ url }` | Invitación de staff |
| `trial_expiring` | Tu prueba gratuita expira en N días · Saffi | `{ days, name }` | Aviso 3 días antes |
| `trial_expired` | Tu prueba gratuita ha expirado · Saffi | `{ days, name }` | Aviso al expirar |

**Remitente:** `Saffi <hola@saffi.app>` — fijo en el código.

### Diseño de emails

Todos los templates comparten:
- Logo Saffi SVG en el header
- Footer azul oscuro (`#0B2A4A`) con link a `saffi.app`
- Layout table-based compatible con clientes de email
- Botón CTA con fondo `#F5B544` (dorado Saffi)

---

## 3. Cron job — `POST /api/cron/trial-emails`

**Archivo:** `app/api/cron/trial-emails/route.ts`

**Schedule:** diariamente a las 09:00 UTC (configurado en `vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/trial-emails",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Autenticación

El endpoint acepta dos formas de autenticación (ambas comparan contra `CRON_SECRET`):

```
Authorization: Bearer <CRON_SECRET>   ← Vercel Cron Jobs (automático)
x-cron-secret: <CRON_SECRET>          ← llamadas manuales / testing
```

La ruta `api/cron` está excluida del middleware de autenticación de sesión (ver `middleware.ts` matcher).

### Lógica de ejecución

```
1. Obtener todos los tenants con status='trial' y is_superadmin=false
2. Para cada tenant:
   a. Calcular daysLeft = ceil((trial_ends_at - now) / 86400000)
   b. Si daysLeft != 3 y daysLeft != 0 → skip
   c. Elegir template: daysLeft <= 0 → 'trial_expired', sino 'trial_expiring'
   d. Verificar en email_queue si ya se envió este template hoy → skip si existe
   e. Obtener email del owner via auth.admin.getUserById()
   f. Insertar registro en email_queue
   g. Llamar sendEmail()
   h. Actualizar email_queue con sent_at o error
3. Retornar { ok, processed, errors }
```

### Deduplicación — tabla `email_queue`

Evita reenvíos si el cron se ejecuta más de una vez en el día:

```sql
-- Columnas relevantes
tenant_id    uuid
owner_id     uuid
template     text
data         jsonb    -- { days, name }
sent_at      timestamptz  -- NULL hasta que se envía
error        text         -- mensaje de error si falla
created_at   timestamptz
```

Antes de enviar, consulta:
```typescript
.eq('tenant_id', tenant.id)
.eq('template', template)
.gte('created_at', todayStart.toISOString())
```

Si encuentra una fila → skip (ya procesado hoy).

### Response

```json
{ "ok": true, "processed": 2, "errors": 0 }
```

`processed` = emails enviados con éxito. `errors` = intentos fallidos (registrados en `email_queue.error`).

---

## 4. Flujo completo por escenario

### Trial expirando en 3 días
```
09:00 UTC — Vercel Cron → GET /api/cron/trial-emails
  → Authorization: Bearer <CRON_SECRET>
  → tenant con trial_ends_at = hoy + 3 días
  → sendEmail({ template: 'trial_expiring', data: { days: '3' } })
  → email_queue.sent_at = now()
```

### Trial expirado hoy
```
09:00 UTC — Vercel Cron → GET /api/cron/trial-emails
  → tenant con trial_ends_at = hoy o pasado (daysLeft = 0)
  → sendEmail({ template: 'trial_expired' })
  → email_queue.sent_at = now()
```

### Testing manual
```bash
curl -X POST https://app.saffi.app/api/cron/trial-emails \
  -H "x-cron-secret: <CRON_SECRET>"
```

---

## 5. Dónde se usan los otros templates

| Template | Llamado desde |
|---|---|
| `welcome` | Pendiente — Supabase Auth envía el email de confirmación nativo por ahora |
| `invite` | Pendiente — `app/api/invite/route.ts` aún usa `inviteUserByEmail` de Supabase |
| `trial_expiring` | `app/api/cron/trial-emails/route.ts` |
| `trial_expired` | `app/api/cron/trial-emails/route.ts` |