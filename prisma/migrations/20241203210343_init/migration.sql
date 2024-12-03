/*
  Warnings:

  - You are about to drop the column `contractAddress` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `listCount` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `requestCount` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "contractAddress",
DROP COLUMN "listCount",
DROP COLUMN "name",
DROP COLUMN "requestCount";
