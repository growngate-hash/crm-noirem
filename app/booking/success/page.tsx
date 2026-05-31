'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function BookingSuccessContent() {
  const params  = useSearchParams()
  const token   = params.get('token')
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'invalid'>('loading')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }

    const supabase = createClient()

    async function verify() {
      const { data } = await supabase
        .from('booking_requests')
        .select('id, service_name, scheduled_at, customer_name, status')
        .eq('payment_token', token)
        .maybeSingle()

      setStatus(data ? 'confirmed' : 'invalid')
    }

    verify()
  }, [token])

  if (status === 'loading') {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center',
                     justifyContent: 'center', background: '#0a0a0a' }}>
        <p style={{ color: '#888', fontSize: 16 }}>Verifying payment…</p>
      </main>
    )
  }

  if (status === 'invalid') {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center',
                     justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <p style={{ color: '#ef4444', fontSize: 18, marginBottom: 8 }}>
            Link expired or invalid
          </p>
          <p style={{ color: '#888', fontSize: 14 }}>
            Please contact us on WhatsApp for assistance.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center',
                   justifyContent: 'center', background: '#0a0a0a' }}>
      <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
          Payment confirmed
        </h1>
        <p style={{ color: '#888', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          Your booking is confirmed. We will contact you on WhatsApp with the details.
        </p>
        <a
          href="/booking/noirem"
          style={{ color: '#ca9a3c', fontSize: 14, textDecoration: 'none' }}
        >
          Book another service
        </a>
      </div>
    </main>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center',
                     justifyContent: 'center', background: '#0a0a0a' }}>
        <p style={{ color: '#888', fontSize: 16 }}>Loading…</p>
      </main>
    }>
      <BookingSuccessContent />
    </Suspense>
  )
}
