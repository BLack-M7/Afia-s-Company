-- Migration: Add user creation trigger and RLS policy
-- This migration adds the automatic user profile creation trigger
-- Run this ONLY if you haven't run the full schema.sql yet

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::user_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policy for inserts (with IF NOT EXISTS check)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Service role can insert users'
  ) THEN
    CREATE POLICY "Service role can insert users" ON public.users
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Verify the setup
SELECT 
  'Trigger created successfully' as status,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

SELECT 
  'Policy created successfully' as status,
  policyname,
  tablename
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname = 'Service role can insert users';

SELECT 
  'Function created successfully' as status,
  proname as function_name
FROM pg_proc 
WHERE proname = 'handle_new_user'
AND pronamespace = 'public'::regnamespace;

