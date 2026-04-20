-- AlterTable
-- Add username column to users table (required for username-based authentication)
-- Migrate existing users: copy email to username as temporary value
-- Make username unique and required
-- Keep email unique for backward compatibility

-- Step 1: Add username column as nullable first
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Step 2: Populate username from email for existing users (before @ symbol)
UPDATE "users" SET "username" = split_part("email", '@', 1) WHERE "username" IS NULL;

-- Step 3: Make username NOT NULL
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Step 4: Create unique constraint on username
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Step 5: Create index on username for performance
CREATE INDEX "users_username_idx" ON "users"("username");

-- Note: Email remains unique and required for backward compatibility
-- Email unique index already exists from migration 20260227211202_add_user_model
