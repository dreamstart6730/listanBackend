/*
  Warnings:

  - You are about to drop the column `potalSite` on the `RequestYellow` table. All the data in the column will be lost.
  - Added the required column `portalSite` to the `RequestYellow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RequestYellow" DROP COLUMN "potalSite",
ADD COLUMN     "portalSite" TEXT NOT NULL;
