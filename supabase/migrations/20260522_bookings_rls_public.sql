-- ── Allow staff to see all bookings, including public ones (user_id IS NULL) ──

-- Drop any existing restrictive SELECT policy on bookings
DROP POLICY IF EXISTS "Users can view own bookings"  ON bookings;
DROP POLICY IF EXISTS "Staff can view all bookings"  ON bookings;
DROP POLICY IF EXISTS "Enable read access for users" ON bookings;

-- New policy: authenticated staff can read all bookings regardless of user_id
CREATE POLICY "Staff can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (true);

-- Ensure staff can still insert / update / delete
DROP POLICY IF EXISTS "Users can insert own bookings"  ON bookings;
DROP POLICY IF EXISTS "Staff can manage all bookings"  ON bookings;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON bookings;
DROP POLICY IF EXISTS "Enable update for authenticated" ON bookings;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON bookings;

CREATE POLICY "Staff can manage all bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);