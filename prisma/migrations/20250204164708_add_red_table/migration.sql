-- CreateTable
CREATE TABLE "RequestRed" (
    "id" SERIAL NOT NULL,
    "requestRandId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "wishNum" INTEGER NOT NULL DEFAULT 0,
    "workSelection" JSONB NOT NULL,
    "areaSelection" JSONB NOT NULL,
    "areaMemo" TEXT NOT NULL,
    "completeState" INTEGER NOT NULL,
    "cancelState" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestAt" TIMESTAMP(3),
    "deliveryAt" TIMESTAMP(3),
    "filePath" TEXT DEFAULT '',
    "fileName" TEXT DEFAULT '',
    "listCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RequestRed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestRed_requestRandId_key" ON "RequestRed"("requestRandId");

-- AddForeignKeys
ALTER TABLE "RequestRed" ADD CONSTRAINT "RequestRed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
