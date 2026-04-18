-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "commissionCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "creatorCodeId" TEXT;

-- CreateTable
CREATE TABLE "CreatorCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "commissionPercent" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorCode_code_key" ON "CreatorCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorCode_userId_key" ON "CreatorCode"("userId");

-- CreateIndex
CREATE INDEX "Order_creatorCodeId_idx" ON "Order"("creatorCodeId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_creatorCodeId_fkey" FOREIGN KEY ("creatorCodeId") REFERENCES "CreatorCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorCode" ADD CONSTRAINT "CreatorCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
