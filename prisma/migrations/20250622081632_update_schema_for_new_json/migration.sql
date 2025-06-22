/*
  Warnings:

  - You are about to drop the column `average_rating` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `reviews_count` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `seller_name_from_json` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[review_id_from_json]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "average_rating",
DROP COLUMN "image_url",
DROP COLUMN "reviews_count",
DROP COLUMN "seller_name_from_json",
ADD COLUMN     "image" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "rating_number" INTEGER,
ADD COLUMN     "store_seller_id_from_json" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "description" SET DATA TYPE TEXT,
ALTER COLUMN "verified_product" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "review_id_from_json" INTEGER,
ALTER COLUMN "rating" DROP NOT NULL,
ALTER COLUMN "verified_purchase" DROP NOT NULL,
ALTER COLUMN "helpful_vote" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sellers" ALTER COLUMN "trust_score" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "join_date" DROP NOT NULL,
ALTER COLUMN "trust_score" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_review_id_from_json_key" ON "reviews"("review_id_from_json");
