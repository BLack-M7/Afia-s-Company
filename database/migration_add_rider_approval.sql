-- Migration: Add rider approval system
-- This migration adds approval status for rider accounts

-- Add approved column to users table for rider approval
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);

-- Update approval_status for existing users
-- Customers and admins are auto-approved
UPDATE public.users 
SET approved = true, approval_status = 'approved' 
WHERE role IN ('customer', 'admin');

-- Riders need approval by default
UPDATE public.users 
SET approved = false, approval_status = 'pending' 
WHERE role = 'rider' AND approval_status = 'pending';

-- Create index for faster queries on approval status
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON public.users(approval_status);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Add RLS policy for admins to view all users
-- Drop policy if it exists first
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Add RLS policy for admins to update users (for approvals)
-- Drop policy if it exists first
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Function to approve rider
CREATE OR REPLACE FUNCTION public.approve_rider(rider_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET approved = true, approval_status = 'approved', updated_at = NOW()
  WHERE id = rider_id AND role = 'rider';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject rider
CREATE OR REPLACE FUNCTION public.reject_rider(rider_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET approved = false, approval_status = 'rejected', updated_at = NOW()
  WHERE id = rider_id AND role = 'rider';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.users.approved IS 'Whether the user account is approved (mainly for riders)';
COMMENT ON COLUMN public.users.approval_status IS 'Approval status: pending, approved, rejected';
COMMENT ON COLUMN public.users.vehicle_type IS 'Type of vehicle for riders (e.g., Motorcycle, Car, Bicycle)';
COMMENT ON COLUMN public.users.license_number IS 'Driver license number for riders';

