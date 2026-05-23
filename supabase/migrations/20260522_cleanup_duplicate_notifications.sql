-- Remove duplicate notifications keeping only the most recent per (title, message, day)
DELETE FROM notifications
WHERE id NOT IN (
  SELECT DISTINCT ON (title, message, DATE(created_at)) id
  FROM notifications
  ORDER BY title, message, DATE(created_at), created_at DESC
);