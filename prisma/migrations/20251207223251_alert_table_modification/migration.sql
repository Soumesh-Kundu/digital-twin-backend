-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'RESOLVED', 'UNRESOLVED');

-- AlterTable
ALTER TABLE "Alerts" ADD COLUMN     "reason" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT,
ADD COLUMN     "status" "AlertStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "Alerts" ADD CONSTRAINT "Alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
