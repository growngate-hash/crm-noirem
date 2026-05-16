import { createClient } from '@/lib/supabase/client'
import { createNotification } from './createNotification'

export async function generateInvoiceFromBooking(bookingId: string) {
  const supabase = createClient()

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      contacts (id, name, email, phone),
      services (id, name, base_price),
      vehicles (id, name, license_plate)
    `)
    .eq('id', bookingId)
    .single()

  if (error || !booking) {
    console.error('Error obteniendo booking:', error)
    return null
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact' })
    .gte('created_at', `${year}-${month}-01`)

  const sequence = String((count || 0) + 1).padStart(3, '0')
  const invoiceNo = `INV-${year}${month}-${sequence}`

  const subtotal = booking.price || 0
  const discount = booking.discount || 0
  const taxRate = 0.05
  const taxAmount = (subtotal - discount) * taxRate
  const total = subtotal - discount + taxAmount

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      booking_id: booking.id,
      contact_id: booking.contact_id,
      invoice_no: invoiceNo,
      subtotal,
      discount,
      tax: taxAmount,
      total,
      status: 'draft',
      issued_at: now.toISOString(),
      due_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (invoiceError) {
    console.error('Error creando factura:', invoiceError)
    return null
  }

  await createNotification({
    type: 'payment',
    title: 'Factura generada automáticamente',
    message: `${invoiceNo} · ${booking.contacts?.name ?? '—'} · AED ${total.toFixed(2)}`,
    link: '/finance',
  })

  return invoice
}
