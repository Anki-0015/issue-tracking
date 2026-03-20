-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('ROADS', 'ACCESSIBILITY', 'SANITATION', 'UTILITIES', 'PUBLIC_SAFETY');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('REPORTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "issueCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "subCategory" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'REPORTED',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationLabel" TEXT,
    "mediaUrls" TEXT[],
    "rejectionReason" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reporterId" TEXT NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_status_history" (
    "id" TEXT NOT NULL,
    "comment" TEXT,
    "fromStatus" "IssueStatus",
    "toStatus" "IssueStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "issue_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issues_issueCode_key" ON "issues"("issueCode");

-- CreateIndex
CREATE INDEX "issues_status_createdAt_idx" ON "issues"("status", "createdAt");

-- CreateIndex
CREATE INDEX "issues_category_idx" ON "issues"("category");

-- CreateIndex
CREATE INDEX "issues_reporterId_idx" ON "issues"("reporterId");

-- CreateIndex
CREATE INDEX "issues_createdAt_idx" ON "issues"("createdAt");

-- CreateIndex
CREATE INDEX "issue_status_history_issueId_createdAt_idx" ON "issue_status_history"("issueId", "createdAt");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
