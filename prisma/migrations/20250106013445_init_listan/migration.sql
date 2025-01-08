-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "passwordResetToken" TEXT NOT NULL DEFAULT '',
    "role" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "contractId" TEXT NOT NULL,
    "memo" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" SERIAL NOT NULL,
    "requestRandId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "mainCondition" JSONB NOT NULL,
    "subCondition" JSONB NOT NULL,
    "areaSelection" JSONB NOT NULL,
    "areaMemo" TEXT NOT NULL,
    "completeState" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filePath" TEXT DEFAULT '',
    "fileName" TEXT DEFAULT '',
    "listCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_contractId_key" ON "User"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_contractId_key" ON "Client"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "Request_requestRandId_key" ON "Request"("requestRandId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Client"("contractId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
