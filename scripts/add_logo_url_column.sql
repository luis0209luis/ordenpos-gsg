-- Script para agregar la columna "logo_url" a la tabla "settings" en Supabase.
-- Ejecuta este comando SQL en la sección "SQL Editor" de tu panel de Supabase.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
