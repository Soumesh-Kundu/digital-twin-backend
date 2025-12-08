-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "Alerts" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Alerts" ADD CONSTRAINT "Alerts_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
