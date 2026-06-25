-- Script para agregar la columna "blend_config" a la tabla "products" en Supabase.
-- Ejecuta estos comandos SQL en la sección "SQL Editor" de tu panel de Supabase.

ALTER TABLE products ADD COLUMN IF NOT EXISTS blend_config jsonb;
