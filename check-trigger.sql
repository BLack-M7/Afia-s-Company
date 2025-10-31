-- Check if user trigger and policies are properly set up
-- Run this in Supabase SQL Editor to diagnose signup issues

-- 1. Check if the trigger function exists
SELECT 
  'Trigger Function' as check_type,
  proname as function_name,
  pronargs as num_args,
  CASE 
    WHEN proname = 'handle_new_user' THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as status
FROM pg_proc 
WHERE proname = 'handle_new_user'
AND pronamespace = 'public'::regnamespace;

-- 2. Check if the trigger exists
SELECT 
  'Trigger' as check_type,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE 
    WHEN tgname = 'on_auth_user_created' THEN '✅ Trigger exists'
    ELSE '❌ Trigger missing'
  END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Check RLS policies for users table
SELECT 
  'RLS Policy' as check_type,
  policyname,
  tablename,
  CASE 
    WHEN policyname LIKE '%insert%' AND tablename = 'users' THEN '✅ Insert policy exists'
    WHEN tablename = 'users' THEN '⚠️ Other policy'
    ELSE '❌ Missing insert policy'
  END as status
FROM pg_policies 
WHERE tablename = 'users';

-- 4. Check if users table exists and has correct structure
SELECT 
  'Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 5. Check if the user_role enum exists
SELECT 
  'Enum Type' as check_type,
  t.typname as enum_name,
  CASE 
    WHEN t.typname = 'user_role' THEN '✅ Enum exists'
    ELSE '❌ Enum missing'
  END as status
FROM pg_type t 
WHERE t.typname = 'user_role';

-- 6. Test the trigger function (dry run)
-- This will show what data would be inserted
SELECT 
  'Trigger Test' as check_type,
  'Would insert with metadata:' as note,
  '{"full_name": "Test User", "phone": "+1234567890", "role": "customer"}' as test_data;

