import { NextResponse } from 'next/server'

// Booking is handled via direct Supabase insert in app/booking/page.tsx.
// The SQL trigger trg_booking_request_to_bookings creates contact, vehicle, and booking.
export async function POST() {
  return NextResponse.json({ message: 'use direct insert' })
}