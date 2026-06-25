-- Fix: Add 'blend' to the inventory_mode check constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_inventory_mode_check;

ALTER TABLE products
  ADD CONSTRAINT products_inventory_mode_check
  CHECK (inventory_mode IN ('finished', 'recipe', 'unlimited', 'blend'));
