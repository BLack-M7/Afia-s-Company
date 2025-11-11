-- Fix user creation trigger to handle errors properly
-- This migration fixes the trigger to prevent "Database error saving new user" errors
-- Run this in your Supabase SQL Editor

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved trigger function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_role TEXT;
  v_email TEXT;
BEGIN
  -- Extract metadata with safe defaults
  v_email := COALESCE(NEW.email, '');
  v_full_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');
  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
  v_role := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
    'customer'
  );

  -- Validate role is one of the allowed values
  IF v_role NOT IN ('customer', 'rider', 'admin') THEN
    v_role := 'customer';
  END IF;

  -- Insert user profile with conflict handling
  -- Using ON CONFLICT DO NOTHING to prevent errors if user already exists
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    v_email,
    v_full_name,
    v_phone,
    v_role::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but allow the auth user creation to succeed
    -- This prevents the trigger from blocking user registration
    RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    -- Return NEW to allow the transaction to continue
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verify the trigger was created
SELECT 
  'Trigger fixed successfully' as status,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

