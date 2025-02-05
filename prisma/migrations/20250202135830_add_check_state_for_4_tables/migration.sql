-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "cancelState" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RequestBlue" ADD COLUMN     "cancelState" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RequestPink" ADD COLUMN     "cancelState" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RequestYellow" ADD COLUMN     "cancelState" INTEGER NOT NULL DEFAULT 0;
