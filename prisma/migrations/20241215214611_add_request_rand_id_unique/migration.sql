-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "requestRandId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "mainCondition" JSONB NOT NULL,
    "subCondition" JSONB NOT NULL,
    "areaSelection" TEXT NOT NULL,
    "areaMemo" TEXT NOT NULL,
    "completeState" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Request_requestRandId_key" ON "Request"("requestRandId");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
