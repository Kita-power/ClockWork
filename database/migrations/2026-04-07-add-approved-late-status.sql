-- Adds the approved_late timesheet status used when overdue submissions are approved.
-- Safe to run multiple times.

DO $$
BEGIN
  -- If status is an enum type named timesheet_status, add the new enum value.
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'timesheet_status'
      AND typtype = 'e'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'timesheet_status'
        AND e.enumlabel = 'approved_late'
    ) THEN
      ALTER TYPE public.timesheet_status ADD VALUE 'approved_late';
    END IF;
  END IF;
END
$$;

-- If status uses a CHECK constraint on public.timesheets, update it to include approved_late.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'timesheets'
      AND constraint_name = 'timesheets_status_check'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.timesheets DROP CONSTRAINT timesheets_status_check;

    ALTER TABLE public.timesheets
      ADD CONSTRAINT timesheets_status_check
      CHECK (
        status IN (
          'draft',
          'submitted',
          'submitted_late',
          'approved',
          'approved_late',
          'rejected',
          'processed'
        )
      );
  END IF;
END
$$;
