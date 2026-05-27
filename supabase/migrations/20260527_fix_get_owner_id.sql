-- Reescribir get_owner_id() para garantizar retorno escalar
-- El error "more than one row returned by a subquery" ocurre porque
-- PostgreSQL evalúa la función como subquery escalar en los WITH CHECK de RLS.
-- LIMIT 1 dentro de un COALESCE no siempre es suficiente en ese contexto.

CREATE OR REPLACE FUNCTION public.get_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.team_members WHERE member_id = auth.uid()
    )
    THEN (
      SELECT owner_id FROM public.team_members
      WHERE member_id = auth.uid()
      ORDER BY created_at ASC
      LIMIT 1
    )
    ELSE auth.uid()
  END;
$$;