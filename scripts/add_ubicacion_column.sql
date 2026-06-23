-- Script para agregar la columna "ubicacion" a la tabla "supply_items" en Supabase.
-- Ejecuta este comando SQL en la sección "SQL Editor" de tu panel de Supabase.

ALTER TABLE supply_items ADD COLUMN IF NOT EXISTS ubicacion TEXT;
