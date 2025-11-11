# Fix for "Database error saving new user" Error

## Problem
The signup is failing with "Database error saving new user" because the database trigger function is encountering an error when trying to create the user profile in the `public.users` table.

## Solution

### Option 1: Fix the Database Trigger (Recommended)

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Run the SQL script from `database/fix_user_trigger.sql`

This will:
- Replace the trigger function with a more robust version that handles errors gracefully
- Add proper error handling to prevent the trigger from blocking user registration
- Handle NULL values and conflicts properly

### Option 2: Disable the Trigger Temporarily

If you can't fix the trigger immediately, you can disable it and let the backend handle user profile creation:

```sql
-- Disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

The backend code has been updated to manually create user profiles if the trigger doesn't create them.

### Option 3: Check Supabase Settings

1. Go to Authentication → Settings in your Supabase dashboard
2. Check if "Enable email confirmations" is enabled
   - If enabled, users need to verify their email before they can sign in
   - The backend has been updated to handle this case
3. Check if "Enable signups" is enabled
4. Verify your email templates are configured correctly

## Verifying the Fix

After applying the fix, test the signup flow:

1. Try creating a new account from the frontend
2. Check the backend logs for any errors
3. Check the Supabase database to verify the user was created in both `auth.users` and `public.users` tables

## Common Issues

### Issue: Email confirmation required
- **Symptom**: User is created but can't log in immediately
- **Solution**: Check Supabase Auth settings and disable email confirmation for development, or ensure email templates are configured

### Issue: RLS policies blocking inserts
- **Symptom**: Trigger fails with permission error
- **Solution**: Verify the "Service role can insert users" policy exists and allows inserts (WITH CHECK (true))

### Issue: Constraint violations
- **Symptom**: Trigger fails with unique constraint or foreign key error
- **Solution**: Check that the `users` table structure matches the trigger function's expectations

## Testing

Run this query in Supabase SQL Editor to verify the trigger is working:

```sql
-- Check if trigger exists
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';
```

