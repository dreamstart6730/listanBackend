/*
  Warnings:

  - A unique constraint covering the columns `[contractId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "contractAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "listCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requestCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "name" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Client_contractId_key" ON "Client"("contractId");
