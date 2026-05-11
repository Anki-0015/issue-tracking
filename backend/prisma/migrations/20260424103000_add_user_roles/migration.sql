-- Create user role enum and role column for RBAC
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CITIZEN');

ALTER TABLE "users"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CITIZEN';
