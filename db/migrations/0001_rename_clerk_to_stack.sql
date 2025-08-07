-- Rename clerkUserId column to stackUserId in vetmed_users table
ALTER TABLE "vetmed_users" RENAME COLUMN "clerk_user_id" TO "stack_user_id";

-- Drop the old unique constraint
ALTER TABLE "vetmed_users" DROP CONSTRAINT IF EXISTS "vetmed_users_clerk_user_id_unique";

-- Add new unique constraint for stackUserId
ALTER TABLE "vetmed_users" ADD CONSTRAINT "vetmed_users_stack_user_id_unique" UNIQUE ("stack_user_id");