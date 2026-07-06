-- Script para crear el disparador (trigger) en la tabla "staff" de Supabase.
-- Este disparador encriptará automáticamente las contraseñas en formato bcrypt (password_hash)
-- cada vez que se cree un nuevo usuario o se actualice su contraseña.
--
-- INSTRUCCIONES:
-- 1. Ve a tu panel de Supabase (https://supabase.com).
-- 2. Entra en tu proyecto y ve a la sección "SQL Editor" en el menú de la izquierda.
-- 3. Crea una nueva consulta (New Query).
-- 4. Copia y pega todo el código de abajo y haz clic en "Run".

-- 1. Crear o reemplazar la función que realiza el hash de la contraseña
CREATE OR REPLACE FUNCTION hash_staff_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es una inserción o el campo password ha cambiado, generamos el hash
  IF TG_OP = 'INSERT' OR NEW.password <> OLD.password THEN
    IF NEW.password IS NOT NULL THEN
      -- Se utiliza la extensión pgcrypto (gen_salt con algoritmo blowfish 'bf' que es bcrypt)
      NEW.password_hash := crypt(NEW.password, gen_salt('bf'));
    ELSE
      NEW.password_hash := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar el disparador si ya existe para evitar duplicados
DROP TRIGGER IF EXISTS trigger_hash_staff_password ON staff;

-- 3. Crear el disparador asociado a la tabla "staff"
CREATE TRIGGER trigger_hash_staff_password
BEFORE INSERT OR UPDATE ON staff
FOR EACH ROW
EXECUTE FUNCTION hash_staff_password();

-- 4. Actualizar los usuarios existentes que tienen contraseña plana pero no tienen hash
UPDATE staff 
SET password_hash = crypt(password, gen_salt('bf'))
WHERE password_hash IS NULL AND password IS NOT NULL;
