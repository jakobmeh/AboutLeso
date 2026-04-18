-- Create variants table so each product can have per-size stock.
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductVariant_productId_size_key" ON "ProductVariant"("productId", "size");
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "ProductVariant_size_idx" ON "ProductVariant"("size");

ALTER TABLE "ProductVariant"
ADD CONSTRAINT "ProductVariant_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Move cart items to variant-based references.
ALTER TABLE "CartItem" ADD COLUMN "variantId" TEXT;

-- Backfill a default UNI variant for existing products.
INSERT INTO "ProductVariant" ("id", "productId", "size", "stock", "isActive", "createdAt", "updatedAt")
SELECT
  p."id" || '_UNI',
  p."id",
  'UNI',
  p."stock",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product" p
ON CONFLICT ("productId", "size") DO UPDATE
SET
  "stock" = EXCLUDED."stock",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "CartItem" c
SET "variantId" = pv."id"
FROM "ProductVariant" pv
WHERE
  pv."productId" = c."productId"
  AND pv."size" = 'UNI'
  AND c."variantId" IS NULL;

ALTER TABLE "CartItem" ALTER COLUMN "variantId" SET NOT NULL;

DROP INDEX IF EXISTS "CartItem_productId_idx";
DROP INDEX IF EXISTS "CartItem_cartId_productId_key";
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_productId_fkey";
ALTER TABLE "CartItem" DROP COLUMN "productId";

CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");
CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");

ALTER TABLE "CartItem"
ADD CONSTRAINT "CartItem_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Store ordered size snapshots and optional variant reference.
ALTER TABLE "OrderItem" ADD COLUMN "productVariantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productSize" TEXT;

UPDATE "OrderItem" oi
SET
  "productVariantId" = pv."id",
  "productSize" = COALESCE(oi."productSize", 'UNI')
FROM "ProductVariant" pv
WHERE
  oi."productId" = pv."productId"
  AND pv."size" = 'UNI'
  AND oi."productVariantId" IS NULL;

CREATE INDEX "OrderItem_productVariantId_idx" ON "OrderItem"("productVariantId");

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productVariantId_fkey"
FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
