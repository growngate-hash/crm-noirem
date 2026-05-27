# Sistema de Facturas — Documentación Técnica

## 1. RESUMEN DEL FLUJO

```
Staff marca booking como "completada"
        │
        │  bookings/page.tsx → onClick del botón ✓ markCompleted
        ▼
 bookings.update({ status: 'completed', completed_at })
        │
        │  Genera número de factura (INV-YYYYMM-NNN)
        ▼
 invoices.insert({ user_id, booking_id, contact_id, subtotal, tax, total, status: 'por_cobrar' })
        │
        │  Notificación interna
        ▼
 notifications.insert({ user_id, type: 'payment', ... })
        │
        ▼
 Modal de factura generada (showInvoiceModal)
        │
        │  Staff marca factura como pagada (MARCAR PAGADA)
        ▼
 invoices.update({ status: 'pagada', transaction_id, paid_at, bank_account_id })
        │
        │  Ajuste de balance bancario
        ▼
 bank_accounts.update({ current_balance: current + invoiceTotal })
```

---

## 2. TABLA `invoices`

> **Importante:** esta tabla fue creada directamente en el Dashboard de Supabase, no mediante un archivo de migración. No existe un `CREATE TABLE invoices` en el repositorio. La única migración que la referencia es `20260527_finance_rls.sql` (políticas RLS) y `compras-setup.sql` (agrega columna `bank_account_id`).

### Columnas conocidas

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | **Obligatorio para RLS** — sin él la policy bloquea todo SELECT posterior |
| `booking_id` | uuid FK → bookings | Booking que generó la factura |
| `contact_id` | uuid FK → contacts | Cliente al que se factura |
| `invoice_no` | text | Formato `INV-YYYYMM-NNN` — generado en el frontend |
| `subtotal` | numeric | Precio base del servicio (sin IVA, antes de descuento) |
| `discount` | numeric | Descuento aplicado |
| `tax` | numeric | IVA 5% sobre `(subtotal - discount)` |
| `total` | numeric | `subtotal - discount + tax` |
| `status` | text | `'por_cobrar'`, `'pagada'`, `'anulada'` |
| `issued_at` | timestamptz | Fecha de emisión |
| `due_at` | timestamptz | Vencimiento (issued_at + 30 días) |
| `paid_at` | timestamptz | Fecha de pago real |
| `transaction_id` | text | Referencia de la transacción bancaria |
| `bank_account_id` | uuid FK → bank_accounts | Cuenta donde ingresó el dinero |
| `void_reason` | text | Motivo de anulación |
| `voided_at` | timestamptz | Fecha de anulación |

### RLS

Definida en `supabase/migrations/20260527_finance_rls.sql`:

```sql
CREATE POLICY "tenant_isolation" ON invoices
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());
```

**Consecuencia crítica:** todo INSERT a `invoices` debe incluir `user_id: user.id`. Sin este campo, el registro se inserta con `user_id = NULL` y la policy bloquea el SELECT posterior — la factura existe en la BD pero el frontend no puede leerla.

---

## 3. GENERACIÓN DE FACTURAS (booking completado)

**Archivo:** `app/(dashboard)/bookings/page.tsx` — botón "✓ markCompleted" dentro del panel de detalle del booking.

### Flujo del onClick

```typescript
// 0. Validar booking y autenticación
const bookingId = detailBooking.id
if (!bookingId) return
const sb = createClient()
const { data: { user } } = await sb.auth.getUser()
if (!user) { addToast('No autenticado', 'error'); return }

// 1. Marcar booking como completado
await sb.from('bookings')
  .update({ status: 'completed', completed_at: new Date().toISOString() })
  .eq('id', bookingId)

// 2. Obtener datos completos del booking
const { data: bk } = await sb.from('bookings')
  .select('*, contacts(name)')
  .eq('id', bookingId)
  .single()

// 3. Calcular número de factura
const now = new Date()
const year = now.getFullYear()
const month = String(now.getMonth() + 1).padStart(2, '0')
const { count } = await sb.from('invoices')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', `${year}-${month}-01`)
const invoiceNo = `INV-${year}${month}-${String((count||0)+1).padStart(3,'0')}`

// 4. Calcular montos
const subtotal = Number(bk.price) || 0
const discount = Number(bk.discount) || 0
const tax      = Number(((subtotal - discount) * 0.05).toFixed(2))
const total    = Number((subtotal - discount + tax).toFixed(2))

// 5. Insertar factura (user_id es obligatorio para RLS)
const { data: inv, error: invError } = await sb.from('invoices')
  .insert({
    user_id: user.id,          // ← obligatorio
    booking_id: bookingId,
    contact_id: bk.contact_id,
    invoice_no: invoiceNo,
    subtotal, discount, tax, total,
    status: 'por_cobrar',
    issued_at: now.toISOString(),
    due_at: new Date(now.getTime() + 30*24*60*60*1000).toISOString(),
  })
  .select()
  .single()

// 6. Notificación interna
await sb.from('notifications').insert({
  user_id: user.id,
  type: 'payment',
  title: 'Factura generada',
  message: `${invoiceNo} · ${bk.contacts?.name ?? '—'} · AED ${total}`,
  read: false,
})
```

### Numeración de facturas

El número se genera contando cuántas facturas existen en el mes actual y sumando 1. **Limitación:** si dos usuarios marcan bookings como completados simultáneamente, podrían obtener el mismo número. Para producción con alto volumen, considerar un sequence en PostgreSQL.

---

## 4. CONFIRMACIÓN DE PAGO

**Función:** `confirmPayment()` en `app/(dashboard)/finance/page.tsx`

Se activa desde el botón "MARCAR PAGADA" en la tabla de facturas. Antes de llamarla, `handleMarkAsPaid(inv)` carga las cuentas bancarias disponibles y abre el modal.

```typescript
async function handleMarkAsPaid(inv: any) {
  const { data: banks } = await createClient()
    .from('bank_accounts')
    .select('*')
    .order('name')             // sin filtro is_active — muestra todas
  setBankAccounts(banks ?? [])
  setSelectedInvoice(inv)
  setShowPaymentModal(true)
}

async function confirmPayment() {
  // Validaciones: transactionId y selectedBankAccount obligatorios

  // 1. Actualizar factura
  await supabase.from('invoices').update({
    status: 'pagada',
    transaction_id: transactionId.trim(),
    paid_at: new Date().toISOString(),
    bank_account_id: selectedBankAccount,
  }).eq('id', selectedInvoice.id)

  // 2. Ajustar balance de la cuenta bancaria
  const bank = bankAccounts.find(b => b.id === selectedBankAccount)
  await supabase.from('bank_accounts').update({
    current_balance: parseFloat(bank.current_balance ?? 0) + parseFloat(selectedInvoice.total),
    updated_at: new Date().toISOString(),
  }).eq('id', selectedBankAccount)
}
```

**Advertencia — no hay transacción atómica:** si el UPDATE de `invoices` pasa pero el de `bank_accounts` falla, la factura queda como "pagada" pero el balance bancario no se actualiza. No hay rollback. Para producción, considerar una función PostgreSQL que envuelva ambas operaciones.

---

## 5. ANULACIÓN DE FACTURAS

**Función:** `handleVoidInvoice()` en `app/(dashboard)/finance/page.tsx`

```typescript
await createClient().from('invoices').update({
  status: 'anulada',
  void_reason: voidReason.trim(),
  voided_at: new Date().toISOString(),
}).eq('id', voidingInvoice.id)
```

Las facturas anuladas no se eliminan — permanecen en la BD con `status: 'anulada'`. Los KPIs las excluyen del cálculo de revenue.

---

## 6. TABLA `bank_accounts`

> También creada directamente en Supabase, no mediante migración. La columna `bank_account_id` fue agregada a `invoices` y `purchase_invoices` vía `compras-setup.sql`.

### RLS

```sql
CREATE POLICY "tenant_isolation" ON bank_accounts
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());
```

### Query en el modal de pago

`handleMarkAsPaid` carga las cuentas **sin filtro `is_active`** — muestra todas incluyendo inactivas. `loadBankAccounts()` (tab Compras) sí filtra por `is_active = true`. Hay inconsistencia — el modal de pago debería usar el mismo filtro.

---

## 7. KPIs FINANCIEROS

Calculados en `fetchFinanceKPIs()` (`app/(dashboard)/finance/page.tsx`). Siempre acotados al mes en curso en zona horaria Dubai (UTC+4) usando `useTimezone()`.

| KPI | Fuente | Filtro |
|---|---|---|
| Total Revenue MTD | `invoices` donde `status = 'pagada'` | `paid_at` entre inicio y fin de mes (UTC) |
| Total Expenses MTD | `expenses` + `purchase_invoices` pagadas | `date` / `payment_date` dentro del mes |
| Net Profit | `totalRevenue - totalExpenses` | — |
| VAT cobrado | `invoices.tax` donde `status = 'pagada'` | Mismo rango que revenue |
| VAT pagado | `purchase_invoices.tax` donde `created_at >= inicioMes` | Aproximación — usa `created_at`, no `payment_date` |
| VAT neto FTA | `vatMTD - vatPagadoMTD` | — |

---

## 8. PUNTOS CRÍTICOS

1. **`user_id` es obligatorio en todo INSERT a `invoices`.** La RLS filtra por `user_id = get_owner_id()`. Un insert sin `user_id` crea la fila pero hace invisible al owner — el frontend mostrará 0 facturas aunque existan en la BD.

2. **La tabla `invoices` no tiene migración de creación.** Fue creada en el Dashboard de Supabase. Si se necesita reproducir el esquema en otro entorno, debe hacerse manualmente o con `supabase db dump`.

3. **`generate_journal_entry_for_invoice()`** es un trigger en la BD (aplicado directamente, documentado en `20260527_fix_journal_trigger.sql`) que genera asientos contables al crear facturas. Debe filtrar por `user_id` en todos sus SELECTs a `chart_of_accounts`, de lo contrario falla con error 21000 en entornos multi-tenant.

4. **No hay trigger que actualice `bank_accounts` automáticamente.** El balance se ajusta manualmente desde `confirmPayment()`. Si la función falla a mitad, el estado queda inconsistente.

5. **El conteo para numeración de facturas no es atómico.** Dos inserts simultáneos en el mismo mes pueden generar el mismo `invoice_no`.

---

## 9. MIGRACIONES RELEVANTES

| Archivo | Contenido |
|---|---|
| `20260527_finance_rls.sql` | RLS para `invoices`, `expenses`, `purchase_invoices`, `bank_accounts` |
| `20260527_fix_get_owner_id.sql` | Fix de `get_owner_id()` que desbloquea los WITH CHECK de RLS en estas tablas |
| `20260527_fix_journal_trigger.sql` | Documentación del fix a `generate_journal_entry_for_invoice()` |
| `compras-setup.sql` | Agrega `bank_account_id` a `invoices` y crea `purchase_invoices` |