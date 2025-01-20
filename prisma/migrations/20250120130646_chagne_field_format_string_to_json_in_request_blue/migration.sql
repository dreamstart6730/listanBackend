/*
  Warnings:

  - Changed the type of `detailCondition` on the `RequestBlue` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "RequestBlue" DROP COLUMN "detailCondition",
ADD COLUMN     "detailCondition" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "RequestYellow" (
    "id" SERIAL NOT NULL,
    "requestRandId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "potalSite" TEXT NOT NULL,
    "areaSelection" JSONB NOT NULL,
    "areaMemo" TEXT NOT NULL,
    "completeState" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestAt" TIMESTAMP(3),
    "deliveryAt" TIMESTAMP(3),
    "filePath" TEXT DEFAULT '',
    "fileName" TEXT DEFAULT '',
    "listCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RequestYellow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestPink" (
    "id" SERIAL NOT NULL,
    "requestRandId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "potalSite" TEXT NOT NULL,
    "areaSelection" JSONB NOT NULL,
    "areaMemo" TEXT NOT NULL,
    "completeState" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestAt" TIMESTAMP(3),
    "deliveryAt" TIMESTAMP(3),
    "filePath" TEXT DEFAULT '',
    "fileName" TEXT DEFAULT '',
    "listCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RequestPink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestYellow_requestRandId_key" ON "RequestYellow"("requestRandId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestPink_requestRandId_key" ON "RequestPink"("requestRandId");

-- AddForeignKey
ALTER TABLE "RequestYellow" ADD CONSTRAINT "RequestYellow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPink" ADD CONSTRAINT "RequestPink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
