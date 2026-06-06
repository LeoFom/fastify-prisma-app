/*
  Warnings:

  - You are about to drop the column `roast` on the `products` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CoffeeType" AS ENUM ('Beans', 'Ground', 'Drip', 'Capsules');

-- CreateEnum
CREATE TYPE "ProcessingMethod" AS ENUM ('Washed', 'Natural', 'Honey', 'Anaerobic', 'SemiWashed');

-- CreateEnum
CREATE TYPE "BrewingMethod" AS ENUM ('Espresso', 'Filter', 'V60', 'Aeropress', 'Chemex', 'Moka', 'Turkish', 'FrenchPress');

-- AlterTable
ALTER TABLE "products" DROP COLUMN "roast",
ADD COLUMN     "brandId" UUID;

-- CreateTable
CREATE TABLE "flavor_notes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flavor_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coffee_details" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "coffeeType" "CoffeeType" NOT NULL,
    "roast" "RoastType",
    "originCountry" TEXT,
    "region" TEXT,
    "farm" TEXT,
    "processingStation" TEXT,
    "altitudeMin" INTEGER,
    "altitudeMax" INTEGER,
    "variety" TEXT,
    "processingMethod" "ProcessingMethod",
    "scaScore" DECIMAL(4,2),
    "arabicaPercent" INTEGER,
    "robustaPercent" INTEGER,
    "acidity" INTEGER,
    "sweetness" INTEGER,
    "bitterness" INTEGER,
    "body" INTEGER,
    "caffeineLevel" INTEGER,
    "weightGrams" INTEGER,
    "roastDate" TIMESTAMP(3),
    "brewingMethods" "BrewingMethod"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coffee_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CoffeeDetailsToFlavorNote" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CoffeeDetailsToFlavorNote_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "flavor_notes_name_key" ON "flavor_notes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "coffee_details_productId_key" ON "coffee_details"("productId");

-- CreateIndex
CREATE INDEX "coffee_details_originCountry_idx" ON "coffee_details"("originCountry");

-- CreateIndex
CREATE INDEX "coffee_details_region_idx" ON "coffee_details"("region");

-- CreateIndex
CREATE INDEX "coffee_details_roast_idx" ON "coffee_details"("roast");

-- CreateIndex
CREATE INDEX "coffee_details_processingMethod_idx" ON "coffee_details"("processingMethod");

-- CreateIndex
CREATE INDEX "coffee_details_weightGrams_idx" ON "coffee_details"("weightGrams");

-- CreateIndex
CREATE INDEX "_CoffeeDetailsToFlavorNote_B_index" ON "_CoffeeDetailsToFlavorNote"("B");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_brandId_idx" ON "products"("brandId");

-- AddForeignKey
ALTER TABLE "coffee_details" ADD CONSTRAINT "coffee_details_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffeeDetailsToFlavorNote" ADD CONSTRAINT "_CoffeeDetailsToFlavorNote_A_fkey" FOREIGN KEY ("A") REFERENCES "coffee_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffeeDetailsToFlavorNote" ADD CONSTRAINT "_CoffeeDetailsToFlavorNote_B_fkey" FOREIGN KEY ("B") REFERENCES "flavor_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
