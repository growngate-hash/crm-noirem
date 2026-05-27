# Integración WhatsApp — Documentación Técnica

## 1. RESUMEN DEL FLUJO

```
Cliente envía mensaje por WhatsApp
        │
        │  HTTP POST (Meta Graph API)
        ▼
 Supabase Edge Function: whatsapp-bot
        │
        ├─── 1. SAVE ────────────► whatsapp_messages { role: 'user' }
        │
        ├─── 2. FETCH (paralelo)
        │         ├── services (activos)
        │         ├── coverage_zones (activas)
        │         ├── business_hours
        │         ├── company_settings (nombre, teléfono, email, dirección)
        │         ├── whatsapp_messages (últimos 10, historial de conversación)
        │         ├── booking_requests (pendientes/confirmadas del cliente)
        │         └── business_settings (timezone, currency)
        │
        ├─── 3. BUILD ───────────► system prompt (con contexto dinámico)
        │
        ├─── 4. CALL ────────────► OpenAI gpt-4o-mini
        │                          (system prompt + historial + mensaje actual)
        │
        ├─── 5. executeActions() ► detecta [ACTION:CANCEL:uuid] / [ACTION:MODIFY:uuid:ISO]
        │                          ejecuta updates en Supabase
        │                          devuelve texto limpio sin los tags
        │
        ├─── 6. SAVE ────────────► whatsapp_messages { role: 'assistant' }
        │
        └─── 7. SEND ────────────► Meta Graph API v19.0 → cliente WhatsApp
```

**Flujo de conexión inicial (Embedded Signup):**
```
Staff en /settings → botón "Conectar WhatsApp"
        │
        │  FB SDK: FB.login() → callback síncrono recibe { code }
        ▼
 POST /api/whatsapp/exchange-token  (Next.js API Route)
        │
        ├─── 1. code → short-lived token  (Meta Graph API)
        ├─── 2. short-lived → long-lived token (60 días)
        ├─── 3. Fetch WABA + phone_numbers  (Meta Graph API)
        └─── 4. UPSERT ──────────► whatsapp_configs (por user_id)
```

---

## 2. TABLA `whatsapp_configs`

### Propósito
Almacena las credenciales de WhatsApp Business de cada usuario del staff.
Conectada mediante el flujo de **Meta Embedded Signup**.
RLS desactivada — acceso controlado por service_role en la Edge Function.

### Columnas

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | Generado automáticamente |
| `user_id` | uuid FK → auth.users | Unique. Identifica al staff que conectó su WABA |
| `tenant_id` | uuid | Campo legacy de diseño multi-tenant (no se usa activamente) |
| `phone_number_id` | text | ID del número de teléfono en Meta (ej. `"123456789"`) |
| `api_key` | text | Campo legacy (antes: token manual). Reemplazado por `access_token` |
| `access_token` | text | Long-lived token de Meta (válido 60 días) |
| `waba_id` | text | WhatsApp Business Account ID |
| `phone_number` | text | Número en formato display (ej. `"+971 50 123 4567"`) |
| `phone_display` | text | Campo legacy de nombre del número |
| `business_name` | text | Nombre del negocio en Meta |
| `token_expires_at` | timestamptz | `now() + 60 días` al conectar |
| `waba_data` | jsonb | Respuesta completa de `GET /me/businesses` (para referencia) |
| `connected` | boolean | `true` si el flujo de signup completó correctamente |
| `is_active` | boolean | Default `true` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Se actualiza en cada upsert |

### Constraint clave
```sql
UNIQUE (user_id)  -- impide duplicados por usuario; permite ON CONFLICT upsert
```

### RLS
```sql
ALTER TABLE whatsapp_configs DISABLE ROW LEVEL SECURITY;
-- Acceso gestionado directamente por service_role en la Edge Function.
-- El token de acceso es sensible — no exponer via anon key.
```

### Migraciones
- `20260520_whatsapp.sql` — crea tabla inicial con columnas básicas
- `20260524_whatsapp_configs_embedded_signup.sql` — añade columnas de Embedded Signup, hace `phone_number_id` y `api_key` nullable, desactiva RLS

---

## 3. TABLA `whatsapp_messages`

### Propósito
Historial de conversación por número de teléfono. Alimenta la ventana de contexto
que se envía a OpenAI en cada mensaje. Sin esta tabla, el bot no tendría memoria
entre mensajes.

### Estructura
```sql
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone      text NOT NULL,
  role       text NOT NULL,        -- 'user' | 'assistant'
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone
  ON whatsapp_messages(phone, created_at DESC);
```

> **Nota:** La definición está comentada al inicio de `supabase/functions/whatsapp-bot/index.ts`. Debe aplicarse manualmente como migración SQL antes del primer deploy de la función.

### Cómo se usa en la Edge Function
```typescript
// Guardar mensaje entrante del cliente
await supabase.from('whatsapp_messages').insert({ phone, role: 'user', content: text })

// Obtener historial (últimos 10 DESC, luego invertir para orden cronológico)
const { data: historyDesc } = await supabase
  .from('whatsapp_messages')
  .select('role, content')
  .eq('phone', phone)
  .order('created_at', { ascending: false })
  .limit(10)

const history = [...(historyDesc ?? [])].reverse().slice(0, -1)
// .slice(0, -1) excluye el mensaje del usuario que acabamos de insertar
// (ya se añade como último elemento en el array de mensajes a OpenAI)

// Guardar respuesta del asistente
await supabase.from('whatsapp_messages').insert({ phone, role: 'assistant', content: reply })
```

---

## 4. TABLA `whatsapp_sessions`

### Propósito
Máquina de estados por número de teléfono. Diseñada para persistir el estado
de la conversación (ej. `'init'`, `'awaiting_booking_confirmation'`).

### Estructura
```sql
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  phone       text PRIMARY KEY,
  state       text NOT NULL DEFAULT 'init',
  language    text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### Estado actual
**Esta tabla existe en la base de datos pero la Edge Function no la usa actualmente.**
El estado de conversación se infiere del historial en `whatsapp_messages` a través
del contexto enviado a OpenAI. Si en el futuro se necesita lógica determinista
(ej. flujos multi-paso con bifurcaciones), esta tabla es el lugar correcto.

---

## 5. TABLA `whatsapp_logs`

### Propósito
Auditoría de mensajes enviados. Registra si cada envío fue exitoso o falló.

### Estructura
```sql
CREATE TABLE whatsapp_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     uuid,
  booking_id    uuid,
  phone_to      text NOT NULL,
  message_type  text,
  status        text,
  error_message text,
  sent_at       timestamptz DEFAULT now()
);
```

### Estado actual
**La Edge Function actual no escribe en esta tabla.** Los errores se registran
via `console.error` (visibles en Supabase → Edge Function Logs).
Si se necesita auditoría persistente de envíos, agregar un insert en `sendWhatsApp()`.

---

## 6. EDGE FUNCTION `whatsapp-bot`

### Metadatos
- **Runtime:** Deno (no Node.js — APIs diferentes, sin `require`, sin `process.env` en imports)
- **Archivo:** `supabase/functions/whatsapp-bot/index.ts`
- **Trigger:** HTTP webhook configurado en Meta Developer Console
- **Imports vía URL:** `https://deno.land/std@0.168.0/http/server.ts` y `https://esm.sh/@supabase/supabase-js@2`

### Variables de entorno (Supabase Secrets)

| Variable | Descripción | Configurar con |
|---|---|---|
| `WHATSAPP_TOKEN` | Token de acceso de Meta (long-lived) | `supabase secrets set WHATSAPP_TOKEN=...` |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de teléfono en Meta | `supabase secrets set WHATSAPP_PHONE_NUMBER_ID=...` |
| `WHATSAPP_VERIFY_TOKEN` | Token secreto para verificación del webhook | `supabase secrets set WHATSAPP_VERIFY_TOKEN=...` |
| `OPENAI_API_KEY` | Clave de OpenAI | `supabase secrets set OPENAI_API_KEY=...` |
| `BOOKING_URL` | URL de la página de reservas pública | `supabase secrets set BOOKING_URL=https://...` |
| `SUPABASE_URL` | URL del proyecto Supabase | Inyectado automáticamente |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (necesaria para leer/escribir sin RLS) | Inyectado automáticamente |

> **Crítico:** `SUPABASE_SERVICE_ROLE_KEY` se inyecta automáticamente en Edge Functions
> de Supabase. No confundir con `.env.local` donde puede estar vacío.

### Estructura del archivo

```
serve(async (req) => {
  if (req.method === 'GET')  → verificación del webhook Meta
  if (req.method === 'POST') → procesar mensaje entrante
    for (entry of body.entry) {
      for (change of entry.changes) {
        await processMessage(phone, text)
        // si falla: sendWhatsApp(phone, FALLBACK_MSG)
      }
    }
})

async function processMessage(phone, text) { ... }
async function executeActions(text, phone)  { ... }
async function sendWhatsApp(to, text)       { ... }
async function callOpenAI(system, messages) { ... }
```

### Verificación del webhook (GET)
Meta envía un GET con query params para verificar que la URL pertenece al negocio:
```typescript
const mode      = url.searchParams.get('hub.mode')       // 'subscribe'
const token     = url.searchParams.get('hub.verify_token') // debe coincidir con VERIFY_TOKEN
const challenge = url.searchParams.get('hub.challenge')    // echo back si correcto

if (mode === 'subscribe' && token === VERIFY_TOKEN) {
  return new Response(challenge!, { status: 200 })  // éxito
}
return new Response('Forbidden', { status: 403 })
```

---

## 7. `processMessage()` — PASO A PASO

### Paso 1 — Guardar mensaje del cliente
```typescript
await supabase.from('whatsapp_messages').insert({ phone, role: 'user', content: text })
```
Se guarda antes de llamar a OpenAI para que el mensaje quede en BD incluso si OpenAI falla.

### Paso 2 — Obtener contexto (7 queries en paralelo)
```typescript
const [services, zones, hours, settings, historyDesc, activeBookings, bizSettings] = await Promise.all([
  supabase.from('services').select('name, description, base_price, duration_hrs, category')
    .eq('is_active', true).order('category').order('name'),

  supabase.from('coverage_zones').select('name').eq('is_active', true),

  supabase.from('business_hours').select('day_label, is_open, start_time, end_time')
    .order('day_of_week'),

  supabase.from('company_settings').select('key, value')
    .in('key', ['company_name', 'company_phone', 'company_email', 'company_address']),
  // NOTA: company_settings tiene estructura mixta. Esta query lee filas clave-valor
  // (key/value columns). La API de disponibilidad lee travel_time_minutes como columna
  // directa. Son dos mecanismos distintos sobre la misma tabla — ver BOOKING_CONTACTS_LOGIC.md §8.

  supabase.from('whatsapp_messages').select('role, content')
    .eq('phone', phone).order('created_at', { ascending: false }).limit(10),

  supabase.from('booking_requests').select('id, service_name, scheduled_at, status')
    .eq('customer_phone', phone).in('status', ['pending', 'confirmed'])
    .order('scheduled_at', { ascending: true }),

  supabase.from('business_settings').select('timezone, currency').maybeSingle(),
])

const timezone = bizSettings?.timezone ?? 'Asia/Dubai'
const currency = bizSettings?.currency ?? 'AED'
```

El historial se invierte después para orden cronológico. El último mensaje (recién insertado)
se excluye con `.slice(0, -1)` porque ya se añade como el mensaje `'user'` final.

Las reservas activas se inyectan en el system prompt para que el bot pueda
referirse a ellas al gestionar cancelaciones/modificaciones.

`timezone` y `currency` se usan en el paso 3: las fechas de las reservas activas
se formatean en la zona horaria de la empresa, y la instrucción de moneda del system
prompt es dinámica (`Los precios se muestran en ${currency}`).

### Paso 3 — Construir system prompt
El system prompt se construye dinámicamente concatenando:
- **Datos del negocio** (de `company_settings`)
- **Lista de servicios** (de `services`)
- **Zonas de cobertura** (de `coverage_zones`)
- **Horarios** (de `business_hours`)
- **Reservas activas del cliente** (de `booking_requests`), formateadas en el `timezone` de la empresa
- **Instrucciones de comportamiento**: incluyen la moneda (`currency`) y el timezone dinámicos

Ver sección 8 para el detalle completo del system prompt.

### Paso 4 — Llamar a OpenAI
```typescript
const chatMessages = [
  ...history.map(m => ({ role: m.role, content: m.content })),
  { role: 'user', content: text },
]

const raw = await callOpenAI(systemPrompt, chatMessages)
```

`callOpenAI()` usa `gpt-4o-mini`, `max_tokens: 500`. El system prompt va como
mensaje separado con `role: 'system'`, no como parte del array `messages`.

Si `OPENAI_API_KEY` está vacío o OpenAI falla, se usa `FALLBACK_MSG` (texto genérico
con el link de reservas).

### Paso 5 — Ejecutar acciones y limpiar respuesta
```typescript
reply = await executeActions(raw, phone)
if (!reply) reply = FALLBACK_MSG
```

`executeActions()` extrae los tags `[ACTION:...]` de la respuesta, ejecuta las
operaciones en Supabase y devuelve el texto sin los tags. El cliente nunca ve los tags.

### Paso 6 — Guardar respuesta del asistente
```typescript
await supabase.from('whatsapp_messages').insert({ phone, role: 'assistant', content: reply })
```

### Paso 7 — Enviar al cliente
```typescript
await sendWhatsApp(phone, reply)
```

---

## 8. SYSTEM PROMPT — COMPORTAMIENTO DEL BOT

El system prompt define cuatro comportamientos según el tipo de mensaje:

### 1. PRIMER SALUDO
Mensaje tipo: `hola`, `hello`, `hi`, `مرحبا`, `hey`, `buenos días`, etc.
- Responde con saludo cálido
- **NO envía el link de reservas todavía**

### 2. PREGUNTAS DE INFORMACIÓN
Preguntas sobre servicios, precios, zonas, horarios.
- Responde con información del contexto
- Siempre termina con una pregunta invitando a reservar
- Ejemplos en inglés, español y árabe

### 3. CONFIRMACIÓN DE RESERVA
Cuando el cliente confirma que quiere reservar:
- Detecta el idioma de los mensajes previos del cliente
- Genera el mensaje en **ese mismo idioma**
- Incluye siempre `${BOOKING_URL}` como URL plana (no markdown)
- **No pide fecha, hora ni datos del vehículo** — todo va en la página de reservas
- Plantillas predefinidas:
  - EN: `"Great! You can book here: ${BOOKING_URL} It only takes 2 minutes."`
  - ES: `"Perfecto. Puedes reservar aquí: ${BOOKING_URL} Solo toma 2 minutos."`
  - AR: `"رائع. يمكنك الحجز هنا: ${BOOKING_URL} يستغرق دقيقتين فقط."`

### 4. CANCELAR / MODIFICAR
Ver sección 9 (executeActions).

### Reglas de formato
- **Sin emojis** en ningún mensaje
- **Sin markdown** para links — la URL va directa (`https://...`), no como `[texto](url)`
  porque WhatsApp no renderiza markdown
- Tono cálido y profesional, máximo 3-4 oraciones
- **Responder SIEMPRE en el idioma del cliente**

### Sección de reservas activas en el prompt
```
RESERVAS ACTIVAS DEL CLIENTE:
  • ID: 550e8400-... | Wash & Wax | 15 Jun 2026 10:00 AM | pending
```
Esta sección se genera dinámicamente si el cliente tiene reservas activas.
Si no tiene, se muestra `"RESERVAS ACTIVAS DEL CLIENTE: Ninguna"`.

---

## 9. `executeActions()` — SISTEMA DE TAGS DE ACCIÓN

### Propósito
Permite que OpenAI ordene side effects en Supabase sin exponer esa lógica
al cliente. El bot incluye tags especiales en su respuesta; la función los
ejecuta y los elimina del texto antes de enviarlo al cliente.

### TAG: `[ACTION:CANCEL:uuid]`

**Regex:** `/\[ACTION:CANCEL:([0-9a-f-]{36})\]/gi`

**Ejemplo en respuesta de OpenAI:**
```
Entendido, tu reserva del 15 de junio ha sido cancelada. [ACTION:CANCEL:550e8400-e29b-41d4-a716-446655440000]
```

**Lo que ejecuta:**
```typescript
// 1. Obtener scheduled_at de la booking_request
const { data: br } = await supabase
  .from('booking_requests').select('scheduled_at').eq('id', brId).single()

// 2. Obtener contact IDs por teléfono (Supabase JS no soporta subqueries)
const { data: contacts } = await supabase
  .from('contacts').select('id').eq('phone', phone)

// 3. Cancelar booking_request y bookings vinculados (en paralelo)
await Promise.all([
  supabase.from('booking_requests').update({ status: 'cancelled' }).eq('id', brId),
  supabase.from('bookings').update({ status: 'cancelled' })
    .in('contact_id', contactIds)
    .eq('scheduled_at', br.scheduled_at),
])
```

### TAG: `[ACTION:MODIFY:uuid:ISO8601]`

**Regex:** `/\[ACTION:MODIFY:([0-9a-f-]{36}):([^\]]+)\]/gi`

**Ejemplo:**
```
Tu reserva ha sido reprogramada para el 20 de junio a las 10:00 AM. [ACTION:MODIFY:550e8400-e29b-41d4-a716-446655440000:2026-06-20T06:00:00.000Z]
```

**Lo que ejecuta:**
```typescript
// Mismo patrón: fetch scheduling_at original → find contacts by phone → update ambas tablas
await Promise.all([
  supabase.from('booking_requests').update({ scheduled_at: newDate }).eq('id', brId),
  supabase.from('bookings').update({ scheduled_at: newDate })
    .in('contact_id', contactIds)
    .eq('scheduled_at', br.scheduled_at),
])
```

> **Por qué dos pasos para contacts:** El cliente Supabase JS no soporta subqueries.
> No se puede hacer `WHERE contact_id IN (SELECT id FROM contacts WHERE phone = ...)`.
> Se hace en dos queries separados.

---

## 10. `sendWhatsApp()` — ENVÍO VÍA META GRAPH API

```typescript
await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to,            // número de teléfono del cliente (formato internacional sin +)
    type: 'text',
    text: { body: text },
  }),
})
```

La función no lanza excepción si Meta devuelve error — el `await` no verifica
el status de la respuesta. Si se necesita auditoría de envíos, agregar:
```typescript
const res = await fetch(...)
if (!res.ok) console.error('[sendWhatsApp] failed:', await res.text())
```

---

## 11. FLUJO EMBEDDED SIGNUP (CONEXIÓN INICIAL)

### ¿Qué es?
Meta Embedded Signup es el flujo oficial para conectar una cuenta de WhatsApp Business
a una aplicación de terceros. Abre un popup de Facebook donde el usuario autoriza
el acceso a su WABA (WhatsApp Business Account).

### Credenciales necesarias en `.env.local`
```
NEXT_PUBLIC_FACEBOOK_APP_ID=983108701106865
FACEBOOK_APP_ID=983108701106865
FACEBOOK_APP_SECRET=<secret del App en Meta Developer Console>
```

> `FACEBOOK_APP_SECRET` actualmente está vacío. Sin él, el intercambio de tokens falla.

### Paso a paso

**Frontend — `app/(dashboard)/settings/page.tsx`:**
```typescript
// 1. Cargar FB SDK (script en <head>)
window.FB.init({ appId: FACEBOOK_APP_ID, version: 'v19.0' })

// 2. Iniciar signup — FB.login() solo acepta callback síncrono
window.FB.login((response) => {
  if (response.authResponse?.code) {
    handleFBResponse(response.authResponse.code)  // función async separada
  }
}, { config_id: '<whatsapp_config_id>', response_type: 'code' })

// 3. Intercambiar code por credenciales
async function handleFBResponse(code: string) {
  const res = await fetch('/api/whatsapp/exchange-token', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  // Si success: mostrar número conectado
}
```

> **Por qué `handleFBResponse` separado:** `FB.login()` no acepta callbacks async
> (`async (response) => {}` es inválido). La lógica async debe estar en una función
> separada que se llama desde el callback síncrono.

**Backend — `app/api/whatsapp/exchange-token/route.ts`:**

| Paso | Endpoint Meta | Resultado |
|---|---|---|
| 1 | `GET /oauth/access_token?client_id=...&client_secret=...&code=...` | Short-lived token (~1h) |
| 2 | `GET /oauth/access_token?grant_type=fb_exchange_token&...` | Long-lived token (60 días) |
| 3 | `GET /me/businesses?access_token=...` | WABA ID + datos del negocio |
| 4 | `GET /{waba_id}/phone_numbers?access_token=...` | phone_number_id + display number |
| 5 | `UPSERT whatsapp_configs` (ON CONFLICT user_id) | Credenciales guardadas en Supabase |

`token_expires_at` se calcula como `now() + 60 días`. El sistema no renueva el token
automáticamente — el staff debe reconectar cuando expire.

---

## 12. PUNTOS CRÍTICOS A TENER EN CUENTA

1. **`SUPABASE_SERVICE_ROLE_KEY` en la Edge Function.** A diferencia de `.env.local`
   (donde puede estar vacío), en las Edge Functions de Supabase este secret se inyecta
   automáticamente. Sin él, la función no podría leer/escribir tablas con RLS desactivada
   ni tablas del sistema. No se configura manualmente — viene de la plataforma.

2. **`FACEBOOK_APP_SECRET` debe estar configurado.** Sin este valor en `.env.local`,
   el endpoint `/api/whatsapp/exchange-token` no puede intercambiar el código de
   Embedded Signup por un access token. El signup fallará silenciosamente.

3. **Los secrets de la Edge Function se configuran con CLI, no en `.env.local`.** Ejemplo:
   ```bash
   supabase secrets set WHATSAPP_TOKEN=EAABx...
   supabase secrets set WHATSAPP_PHONE_NUMBER_ID=12345678
   supabase secrets set WHATSAPP_VERIFY_TOKEN=mi_token_secreto
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase secrets set BOOKING_URL=https://crm-noirem.vercel.app/booking
   ```
   Para verificar los secrets configurados: `supabase secrets list`

4. **El token de WhatsApp expira a los 60 días.** Tras la expiración, el bot deja
   de poder enviar mensajes. El campo `token_expires_at` en `whatsapp_configs` permite
   detectar esto, pero el sistema no alerta automáticamente. Añadir un cron o alerta
   proactiva si se necesita.

5. **Deno runtime ≠ Node.js.** La Edge Function usa Deno. Diferencias clave:
   - Imports por URL, no por `node_modules`
   - `Deno.env.get('VAR')` en vez de `process.env.VAR`
   - No hay `require()` — solo `import`
   - `fetch` y `crypto` son globales (no necesitan import)
   - El archivo usa `// @ts-nocheck` para evitar errores de tipos entre TS/Deno

6. **El bot responde a todos los mensajes de texto.** No filtra por número, horario
   ni tipo de remitente. Si se necesita filtrar (ej. solo responder en horario de
   atención), agregar la lógica antes de llamar a `processMessage()`.

7. **El fallback garantiza respuesta al cliente.** Si OpenAI falla, el bot responde
   con `FALLBACK_MSG` (URL de reservas). Si `sendWhatsApp` falla, el error se
   captura silenciosamente en el handler principal. El webhook siempre devuelve
   `200 OK` para que Meta no reintente el mensaje.

8. **`whatsapp_sessions` existe pero no se usa.** Si en el futuro se necesita una
   máquina de estados determinista (ej. flujo de onboarding multi-paso), usar esta
   tabla en vez de depender solo del contexto de OpenAI.

9. **El historial de conversación tiene ventana de 10 mensajes.** Conversaciones muy
   largas perderán contexto temprano. Para ampliarla, cambiar el `.limit(10)` en la
   query de `whatsapp_messages`. Tener en cuenta que más contexto = más tokens = mayor
   latencia y coste en OpenAI.

10. **El bot no verifica que la WABA configurada en Supabase coincida con el número
    al que llega el webhook.** `WHATSAPP_PHONE_NUMBER_ID` es un secret fijo de la
    Edge Function — si hay múltiples WABAs (multi-tenant), la arquitectura actual
    no lo soporta.

---

## 13. CÓMO HACER CAMBIOS COMUNES

### Cambiar el system prompt del bot

El system prompt está en `processMessage()` dentro de `supabase/functions/whatsapp-bot/index.ts`,
en la constante `systemPrompt` (línea ~290).

Tras editar el archivo:
```bash
supabase functions deploy whatsapp-bot
```

No requiere ninguna migración SQL.

### Agregar un nuevo idioma (ej. francés)

1. Abrir `supabase/functions/whatsapp-bot/index.ts`
2. En la sección `CUANDO EL CLIENTE CONFIRME QUE QUIERE RESERVAR`, agregar:
   ```
   - Si el cliente escribió en francés: 'Super! Vous pouvez réserver ici: ${BOOKING_URL} Cela prend 2 minutes.'
   ```
3. Hacer deploy: `supabase functions deploy whatsapp-bot`

### Agregar un nuevo tipo de acción (ej. `[ACTION:RESCHEDULE_ALL]`)

1. En `executeActions()`, agregar el regex y la lógica correspondiente:
   ```typescript
   const rescheduleAllRe = /\[ACTION:RESCHEDULE_ALL:([^\]]+)\]/gi
   for (const m of text.matchAll(rescheduleAllRe)) {
     const newDate = m[1]
     const { data: contacts } = await supabase.from('contacts').select('id').eq('phone', phone)
     const contactIds = (contacts ?? []).map(c => c.id)
     if (contactIds.length > 0) {
       await supabase.from('bookings').update({ scheduled_at: newDate })
         .in('contact_id', contactIds)
         .in('status', ['pending', 'confirmed'])
     }
     clean = clean.replace(m[0], '')
   }
   ```
2. Agregar la instrucción del tag en el system prompt:
   ```
   [ACTION:RESCHEDULE_ALL:nueva_fecha_ISO8601]
   ```
3. Deploy: `supabase functions deploy whatsapp-bot`

### Renovar el token de WhatsApp manualmente

Cuando `token_expires_at` se acerque a la fecha actual:

1. El staff debe ir a `/settings` y volver a hacer click en "Conectar WhatsApp"
2. Esto ejecuta de nuevo el flujo Embedded Signup y hace un UPSERT en `whatsapp_configs`
3. Además, actualizar el secret de la Edge Function:
   ```bash
   supabase secrets set WHATSAPP_TOKEN=EAABx...nuevo_token...
   supabase functions deploy whatsapp-bot
   ```

> En la arquitectura actual, el token en `whatsapp_configs` y el secret `WHATSAPP_TOKEN`
> son independientes. La Edge Function usa el secret, no la tabla. Ambos deben actualizarse.

### Depurar por qué el bot no responde

1. **Verificar webhook activo:** Meta Developer Console → App → WhatsApp → Configuration.
   El webhook debe apuntar a la URL de la Edge Function de Supabase con el Verify Token correcto.

2. **Revisar logs de la Edge Function:** Supabase Dashboard → Edge Functions → whatsapp-bot → Logs.

3. **Verificar secrets:** `supabase secrets list` — comprobar que `WHATSAPP_TOKEN`,
   `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `OPENAI_API_KEY` y `BOOKING_URL` están presentes.

4. **Probar verificación del webhook:** Hacer GET a la URL de la función con los
   query params `hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=test`.
   Debe devolver `test`.

5. **Verificar token no expirado:** Revisar `whatsapp_configs.token_expires_at` para
   el usuario del staff. Si expiró, reconectar desde `/settings`.

### Cambiar el modelo de OpenAI

En `callOpenAI()`, línea ~60:
```typescript
model: 'gpt-4o-mini',  // cambiar aquí
```

Opciones comunes: `'gpt-4o'` (más capaz, más caro), `'gpt-4o-mini'` (actual, balance calidad/coste).
Ajustar también `max_tokens` si es necesario.

### Desplegar la Edge Function

```bash
# Deploy de la función
supabase functions deploy whatsapp-bot

# Ver logs en tiempo real
supabase functions logs whatsapp-bot --scroll

# Verificar secrets configurados
supabase secrets list
```