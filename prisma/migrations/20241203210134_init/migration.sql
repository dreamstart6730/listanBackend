/*
  Warnings:

  - A unique constraint covering the columns `[contractId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "contractId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_contractId_key" ON "User"("contractId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Client"("contractId") ON DELETE SET NULL ON UPDATE CASCADE;
