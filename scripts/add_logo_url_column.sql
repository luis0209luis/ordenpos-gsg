-- Script para agregar las columnas "logo_url" y "logo_light_url" a la tabla "settings" en Supabase.
-- Ejecuta estos comandos SQL en la sección "SQL Editor" de tu panel de Supabase.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS logo_light_url TEXT;
