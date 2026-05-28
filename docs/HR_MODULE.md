# Módulo de Recursos Humanos (HR)

## Estructura de rutas

```
app/(dashboard)/hr/
├── page.tsx                          — Lista de empleados + KPIs + acceso a Nómina
├── employees/
│   ├── new/
│   │   └── page.tsx                  — Formulario de alta de empleado
│   └── [id]/
│       ├── page.tsx                  — Detalle del empleado (Server Component)
│       └── EmployeeAttendance.tsx    — Registro y lista de asistencia (Client Component)
└── payroll/
    ├── page.tsx                      — Lista de períodos de nómina + KPIs
    └── [id]/
        ├── page.tsx                  — Detalle del período (Server Component)
        └── PayrollActions.tsx        — Líneas de nómina + acciones de estado (Client Component)
```

---

## Tipos TypeScript (`types/index.ts`)

Agregados al final de `types/index.ts` sin modificar los tipos existentes:

```typescript
export type EmployeeRole     = 'technician' | 'admin' | 'supervisor'
export type EmployeeStatus   = 'active' | 'inactive'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'holiday' | 'permission'
export type PayrollPeriodStatus = 'draft' | 'approved' | 'paid'
export type SalaryPeriod     = 'monthly' | 'weekly'

export interface Employee {
  id: string; user_id: string; full_name: string
  email: string | null; phone: string | null
  role: EmployeeRole; status: EmployeeStatus
  salary_base: number; salary_period: SalaryPeriod
  start_date: string; end_date: string | null
  notes: string | null; avatar_url: string | null
  created_at: string; updated_at: string
}

export interface Attendance {
  id: string; user_id: string; employee_id: string
  date: string; status: AttendanceStatus
  check_in: string | null; check_out: string | null
  notes: string | null; created_at: string
}

export interface PayrollPeriod {
  id: string; user_id: string; name: string
  start_date: string; end_date: string
  status: PayrollPeriodStatus; total_amount: number
  paid_at: string | null; notes: string | null; created_at: string
}

export interface PayrollLine {
  id: string; user_id: string; payroll_period_id: string; employee_id: string
  days_worked: number; days_absent: number
  salary_base: number; deductions: number; bonuses: number; total: number
  notes: string | null; created_at: string
  employee?: Employee
}
```

---

## Tablas de Supabase requeridas

Las cuatro tablas siguientes deben crearse y tener RLS activada con `get_owner_id()` — ver [MULTI_TENANT.md](MULTI_TENANT.md) para el patrón estándar.

### `employees`

```sql
CREATE TABLE employees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text NOT NULL,
  email        text,
  phone        text,
  role         text CHECK (role IN ('technician', 'admin', 'supervisor')) DEFAULT 'technician',
  status       text CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  salary_base  numeric(12,2) NOT NULL DEFAULT 0,
  salary_period text CHECK (salary_period IN ('monthly', 'weekly')) DEFAULT 'monthly',
  start_date   date NOT NULL,
  end_date     date,
  notes        text,
  avatar_url   text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON employees
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());
```

### `attendance`

La tabla usa una restricción `UNIQUE(employee_id, date)` para que el `upsert` desde `EmployeeAttendance.tsx` funcione correctamente — registrar el mismo empleado en la misma fecha actualiza el registro existente en lugar de duplicarlo.

```sql
CREATE TABLE attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  date        date NOT NULL,
  status      text CHECK (status IN ('present','absent','late','holiday','permission')) DEFAULT 'present',
  check_in    time,
  check_out   time,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (employee_id, date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON attendance
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());
```

### `payroll_periods`

```sql
CREATE TABLE payroll_periods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  status       text CHECK (status IN ('draft','approved','paid')) DEFAULT 'draft',
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_at      timestamptz,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON payroll_periods
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());
```

### `payroll_lines`

```sql
CREATE TABLE payroll_lines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  payroll_period_id uuid REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id       uuid REFERENCES employees(id) ON DELETE CASCADE,
  days_worked       numeric(5,2) NOT NULL DEFAULT 0,
  days_absent       numeric(5,2) NOT NULL DEFAULT 0,
  salary_base       numeric(12,2) NOT NULL DEFAULT 0,
  bonuses           numeric(12,2) NOT NULL DEFAULT 0,
  deductions        numeric(12,2) NOT NULL DEFAULT 0,
  total             numeric(12,2) NOT NULL DEFAULT 0,
  notes             text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON payroll_lines
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());
```

---

## Patrón de autenticación en el módulo HR

**Regla crítica**: `useCompany()` **no expone `company.id`**. El contexto solo provee `companyName`, `companySubtitle`, `logoUrl`, `timezone`, `loaded` y sus setters. Usar `company.id` causa error TypeScript `Property 'company' does not exist on type 'CompanyContextType'`.

Para obtener el `user_id` del tenant en Client Components:

```typescript
// ✅ CORRECTO — patrón usado en todo el módulo HR
const { data: { user } } = await supabase.auth.getUser()
if (!user) { setLoading(false); return }

const { data } = await supabase
  .from('employees')
  .select('*')
  .eq('user_id', user.id)
```

Para Server Components (`page.tsx` de `[id]`):

```typescript
// ✅ CORRECTO
const supabase = await createClient()   // server client
const { data: { user } } = await supabase.auth.getUser()
if (!user) notFound()
```

---

## Cálculo de salario en nómina (`PayrollActions.tsx`)

El total de cada línea se calcula en el frontend antes del INSERT:

```typescript
const dailySalary = selectedEmployee.salary_period === 'monthly'
  ? selectedEmployee.salary_base / 30
  : selectedEmployee.salary_base / 7

const total = Math.max(0, dailySalary * daysWorked + bonuses - deductions)
```

`total_amount` en `payroll_periods` se actualiza manualmente en cada INSERT/DELETE de línea:

```typescript
// Al agregar línea
const newTotal = lines.reduce((sum, l) => sum + l.total, 0) + total
await supabase.from('payroll_periods').update({ total_amount: newTotal }).eq('id', periodId)

// Al eliminar línea
const newTotal = lines.reduce((sum, l) => sum + l.total, 0) - lineTotal
await supabase.from('payroll_periods').update({ total_amount: Math.max(0, newTotal) }).eq('id', periodId)
```

No hay trigger en la BD — el frontend es responsable de mantener `total_amount` sincronizado. Si se implementa un trigger en el futuro, eliminar estas actualizaciones manuales para evitar doble escritura.

---

## Flujo de estados de un período de nómina

```
draft → approved → paid
```

| Estado | Acciones disponibles | Edición de líneas |
|---|---|---|
| `draft` | Agregar empleados, eliminar líneas, Aprobar | Sí |
| `approved` | Marcar como pagado | No |
| `paid` | — | No |

`paid_at` se setea al pasar a `paid`: `paid_at: new Date().toISOString()`.

---

## Asistencia — upsert por fecha

`EmployeeAttendance.tsx` usa `upsert` con `onConflict: 'employee_id,date'`:

```typescript
await supabase.from('attendance').upsert(
  { user_id, employee_id, date, status, check_in, check_out, notes },
  { onConflict: 'employee_id,date' }
)
```

Esto requiere que la restricción `UNIQUE(employee_id, date)` exista en la tabla (ver SQL arriba). Sin ella el `upsert` falla silenciosamente y crea duplicados.

`tz.getToday()` retorna un objeto `Date` — siempre convertir a string ISO antes de usarlo en estado:

```typescript
// ✅ CORRECTO
date: tz.getToday().toISOString().split('T')[0]

// ❌ INCORRECTO — TypeScript error: Type 'Date' is not assignable to type 'string'
date: tz.getToday()
```

---

## Bug crítico: componentes definidos dentro del render

**Síntoma**: los inputs pierden el foco después de cada tecla escrita.

**Causa**: definir un componente como función dentro de otro componente hace que React cree una nueva referencia de función en cada render. Al cambiar de referencia, React desmonta y remonta el subárbol completo — destruyendo el foco del input activo.

```typescript
// ❌ INCORRECTO — Section se redefine en cada render de NewEmployeePage
export default function NewEmployeePage() {
  function Section({ title, children }) { ... }   // nueva referencia en cada render
  return <Section title="...">...</Section>
}

// ✅ CORRECTO — Section es estable, definida a nivel de módulo
function Section({ title, children }) { ... }     // referencia fija

export default function NewEmployeePage() {
  return <Section title="...">...</Section>
}
```

**Regla**: nunca definir componentes dentro de otros componentes. Las constantes de estilo (`LABEL`, `ICON_BASE`, etc.) sí pueden estar a nivel de módulo o dentro del componente — no son componentes y no causan este problema.

---

## Brand system SAFFI — tokens aplicados en el módulo HR

El módulo usa el design system de SAFFI en lugar de las CSS custom properties globales (`--color-*`). Los valores hardcoded son intencionales y coherentes con el sistema SAFFI.

| Token | Valor | Uso |
|---|---|---|
| Fondo página | `#f5f4ef` | `background` de todos los wrappers de página |
| Fondo card | `#FFFFFF` | Cards, secciones, tablas |
| Borde | `#F0EFEA` | Borders de cards, inputs inactivos |
| Texto primario | `#0B2A4A` | Títulos, valores de tabla |
| Texto secundario | `#5A5852` | Labels, subtítulos, valores secundarios |
| Placeholder | `#A8A6A0` | Placeholder de inputs (via `.saffi-input::placeholder`) |
| Acento cyan | `#3DD9D6` | Títulos de sección, focus de inputs, enlaces |
| CTA / botón principal | `#F5B544` | Botones de acción primarios |
| Texto botón CTA | `#1A1A1A` | Texto sobre botones amarillos |
| Error bg | `#FBE7E2` | Fondo de mensajes de error |
| Error color | `#D9533D` | Texto de mensajes de error |

**Tipografías:**
- `Geist, -apple-system, sans-serif` — títulos H1 (`fontSize: 24-28`, `letterSpacing: '-0.025em'`)
- `-apple-system, BlinkMacSystemFont, sans-serif` — body, inputs
- `JetBrains Mono, monospace` — labels de sección, fechas, montos, breadcrumb labels

**Inputs en focus:**
```typescript
border: '1.5px solid #3DD9D6',
boxShadow: '0 0 0 3px rgba(61,217,214,0.12)',
outline: 'none',
```

**Cards:**
```typescript
background: '#FFFFFF',
border: '1px solid #F0EFEA',
borderRadius: 12,
boxShadow: '0 4px 12px rgba(11,42,74,0.06)',
```

---

## Navegación — cambios en Sidebar y LanguageContext

### `components/layout/Sidebar.tsx`

Agregado al array `NAV` entre `bookings` y `finance`:

```typescript
{ labelKey: 'hr', href: '/hr', icon: Users2 }
```

### `contexts/LanguageContext.tsx`

```typescript
// EN
hr: 'HR'

// ES
hr: 'RRHH'
```

Ambas traducciones son obligatorias simultáneamente — la clave `TranslationKey` es un union type de todas las claves del objeto de traducción. Agregar solo en un idioma causa error TypeScript.

---

## Server vs Client Components en el módulo HR

| Archivo | Tipo | Razón |
|---|---|---|
| `hr/page.tsx` | Client | Necesita estado para la tabla + KPIs reactivos |
| `hr/employees/new/page.tsx` | Client | Formulario controlado con `useState` |
| `hr/employees/[id]/page.tsx` | **Server** | Fetch inicial del empleado con `notFound()` si no existe |
| `hr/employees/[id]/EmployeeAttendance.tsx` | Client | Estado del formulario de asistencia + fetch reactivo |
| `hr/payroll/page.tsx` | Client | Estado del formulario de nuevo período + lista reactiva |
| `hr/payroll/[id]/page.tsx` | **Server** | Fetch del período, líneas y empleados disponibles |
| `hr/payroll/[id]/PayrollActions.tsx` | Client | Formulario de líneas + botones de estado |

Los Server Components usan `export const revalidate = 0` para no cachear — necesario porque los Client Components hijos llaman a `router.refresh()` tras mutaciones, lo que re-ejecuta el Server Component y actualiza los datos sin navegar.

---

## Pago de nómina — flujo completo (`PayrollActions.tsx`)

Al hacer clic en "Marcar como pagado" (estado `approved`), **no se ejecuta la acción directamente**. Se abre un modal de confirmación donde el usuario selecciona la cuenta bancaria de pago. Solo entonces se ejecutan tres operaciones en secuencia:

### Paso 1 — Marcar período como pagado

```typescript
await supabase.from('payroll_periods')
  .update({ status: 'paid', paid_at: new Date().toISOString() })
  .eq('id', periodId)
```

### Paso 2 — Descontar saldo de `bank_accounts`

```typescript
await supabase.from('bank_accounts')
  .update({ current_balance: account.current_balance - totalNomina })
  .eq('id', accountId)
```

`totalNomina` = suma de `lines[].total`. El saldo se descuenta directamente — no hay trigger en BD.

### Paso 3 — Generar asiento contable (condicional)

El asiento solo se genera si se cumplen **ambas** condiciones:
1. `bank_accounts.chart_account_id` existe en la fila de la cuenta seleccionada
2. Existe una cuenta con `code = '5120'` en `chart_of_accounts` para ese `user_id`

Si alguna falta, el pago igual se registra (pasos 1 y 2) pero el asiento se omite silenciosamente.

```typescript
// Cabecera
INSERT INTO journal_entries {
  user_id, entry_number,          // JE-YYYYMM-NNNN
  entry_date: tz.getToday(),      // fecha en timezone del tenant
  description: `Pago de nómina — ${periodName}`,
  reference_type: 'payroll',
  reference_id: periodId,
  fiscal_period_id,               // período fiscal abierto, puede ser null
  status: 'posted',
  total_debit: totalNomina,
  total_credit: totalNomina,
}

// Línea DEBE — cuenta 5120 (Nómina)
INSERT INTO journal_lines {
  journal_entry_id, account_id: nominaAccount.id,
  debit: totalNomina, credit: 0,
  currency: currency ?? 'AED',    // de useCompany().currency
  user_id,
}

// Línea HABER — cuenta contable del banco
INSERT INTO journal_lines {
  journal_entry_id, account_id: bankAccountData.chart_account_id,
  debit: 0, credit: totalNomina,
  currency: currency ?? 'AED',
  user_id,
}
```

**Error handling:** si el INSERT a `journal_lines` falla, se elimina automáticamente el `journal_entry` huérfano para mantener consistencia:

```typescript
if (jlError) {
  console.error('[payroll] journal_lines error:', jlError)
  await supabase.from('journal_entries').delete().eq('id', journalEntry.id)
}
```

### Requerimiento crítico: `bank_accounts.chart_account_id`

La tabla `bank_accounts` debe tener una columna `chart_account_id uuid` que apunte a la cuenta contable correspondiente en `chart_of_accounts`. Sin esta columna, los pagos de nómina no generarán asiento contable. Si no existe, agregar:

```sql
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS chart_account_id uuid REFERENCES chart_of_accounts(id);
```

Luego actualizar cada cuenta bancaria con su cuenta contable correspondiente (ej. `1120` para banco, `1110` para caja).

### Props de `PayrollActions` (actualizadas)

```typescript
interface Props {
  periodId: string
  userId: string
  periodStatus: string
  periodDays: number
  periodName: string        // ← requerido para descripción del asiento
  employees: Pick<Employee, 'id' | 'full_name' | 'salary_base' | 'salary_period' | 'role'>[]
  lines: (PayrollLine & { employee: Employee })[]
}
```

`periodName` se pasa desde `payroll/[id]/page.tsx` como `periodName={period.name}`.

### Dependencias del componente

`PayrollActions.tsx` usa tres hooks de contexto:
- `createClient()` — queries Supabase
- `useCompany().currency` — moneda del tenant para las líneas del asiento
- `useTimezone().getToday()` — fecha del asiento en el timezone del tenant

---

## `CompanyContext` — campo `currency`

`contexts/CompanyContext.tsx` expone `currency` después de la actualización que agrega el campo al contexto:

```typescript
interface CompanyContextType {
  companyName: string
  companySubtitle: string
  logoUrl: string | null
  timezone: string
  currency: string     // ← agregado; default 'AED', leído de business_settings.currency
  loaded: boolean
  // ... setters
}
```

El valor viene de `business_settings.currency` vía:

```typescript
sb.from('business_settings')
  .select('timezone, currency')   // currency agregado al SELECT
  .maybeSingle()
  .then(({ data }) => {
    if (data?.timezone) setTimezone(data.timezone)
    if (data?.currency) setCurrency(data.currency)
  })
```

El default `'AED'` se usa cuando `business_settings.currency` es null o la tabla no tiene el campo.

**Nota:** `useCompany()` NO expone `company` como objeto ni `company.id`. Ver sección "Patrón de autenticación" arriba.

---

## Integración con Finance y Dashboard

### Finance tab — "Gastos de Personal"

`app/(dashboard)/finance/page.tsx`, dentro de `CostsTab`, incluye una sección "Gastos de Personal" debajo del Expense Register. Muestra únicamente nóminas con `status = 'paid'`, ordenadas por `paid_at` descendente.

Query usada (`fetchPayroll()`):
```typescript
supabase.from('payroll_periods')
  .select('id, name, start_date, end_date, total_amount, paid_at')
  .eq('user_id', user.id)
  .eq('status', 'paid')
  .order('paid_at', { ascending: false })
```

La sección solo aparece en el tab "Costs & Expenses" — está dentro del bloque `{!invoicesOnly && <>}` por lo que no se renderiza en el tab "Facturas".

### Dashboard KPI — `totalExpenses` incluye nómina

`app/(dashboard)/page.tsx` calcula `totalExpenses` usando `getMonthlyExpenses()` (ver siguiente sección), que suma gastos operativos + facturas de compra + nómina pagada del mes.

### `utils/getMonthlyExpenses.ts` — utilidad centralizada

Centraliza el cálculo de gastos mensuales para evitar duplicación entre `page.tsx` y `finance/page.tsx`. Recibe un cliente Supabase y las fechas ISO del mes, devuelve los tres componentes del gasto:

```typescript
import { getMonthlyExpenses } from '@/utils/getMonthlyExpenses'

const { expensesAmt, comprasAmt, nominaAmt, total: totalExpenses } =
  await getMonthlyExpenses(supabase, inicioMesStr, finMesStr)
// inicioMesStr: 'YYYY-MM-01'
// finMesStr:    'YYYY-MM-DD' (último día del mes)
```

| Campo retornado | Fuente | Filtro |
|---|---|---|
| `expensesAmt` | `expenses.amount` | `date` entre inicio y fin del mes |
| `comprasAmt` | `purchase_invoices.subtotal` | `status='pagada'` + `payment_date` del mes |
| `nominaAmt` | `payroll_periods.total_amount` | `status='paid'` + `paid_at` del mes |
| `total` | suma de los tres | — |

**Regla:** cualquier página que muestre "gastos totales del mes" debe usar esta función para mantener consistencia. No duplicar la lógica inline.