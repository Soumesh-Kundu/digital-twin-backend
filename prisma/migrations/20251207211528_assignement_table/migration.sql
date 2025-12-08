-- CreateEnum
CREATE TYPE "MACHINE_TYPE" AS ENUM ('CNC', 'HYDRAULIC', 'FURNACE', 'ROBOTIC_ARM');

-- CreateEnum
CREATE TYPE "MachinesStatus" AS ENUM ('ACTIVE', 'IDLE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ENGINEER', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "Machines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "status" "MachinesStatus" NOT NULL DEFAULT 'ACTIVE',
    "type" "MACHINE_TYPE" NOT NULL,
    "temperature_max" DOUBLE PRECISION NOT NULL,
    "vibration_max" DOUBLE PRECISION NOT NULL,
    "power_max" DOUBLE PRECISION NOT NULL,
    "thresholds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MAINTENANCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine_Assignments" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "Machine_Assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_Assignments_machineId_userId_key" ON "Machine_Assignments"("machineId", "userId");

-- AddForeignKey
ALTER TABLE "Machine_Assignments" ADD CONSTRAINT "Machine_Assignments_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine_Assignments" ADD CONSTRAINT "Machine_Assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
