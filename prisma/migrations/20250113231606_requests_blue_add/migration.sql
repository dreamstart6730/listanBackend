-- CreateTable
CREATE TABLE "RequestBlue" (
    "id" SERIAL NOT NULL,
    "requestRandId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "detailCondition" TEXT NOT NULL,
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

    CONSTRAINT "RequestBlue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestBlue_requestRandId_key" ON "RequestBlue"("requestRandId");

-- AddForeignKey
ALTER TABLE "RequestBlue" ADD CONSTRAINT "RequestBlue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
