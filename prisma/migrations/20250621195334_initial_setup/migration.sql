-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "user_id_string" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "join_date" TIMESTAMP(3) NOT NULL,
    "total_reviews" INTEGER NOT NULL,
    "trust_score" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sellers" (
    "id" SERIAL NOT NULL,
    "seller_id_string" TEXT NOT NULL,
    "seller_name" TEXT NOT NULL,
    "total_products" INTEGER NOT NULL,
    "trust_score" DOUBLE PRECISION NOT NULL,
    "is_verified" BOOLEAN NOT NULL,

    CONSTRAINT "sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "product_no" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "average_rating" DOUBLE PRECISION,
    "reviews_count" INTEGER,
    "description" TEXT[],
    "price" DOUBLE PRECISION NOT NULL,
    "seller_name_from_json" TEXT NOT NULL,
    "details" JSONB,
    "verified_product" BOOLEAN NOT NULL,
    "review_summary" TEXT,
    "fake_review_percentage" DOUBLE PRECISION,
    "image_url" TEXT,
    "thumbnail_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shipping_info" JSONB,
    "sellerId" INTEGER,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "product_no_ref" INTEGER NOT NULL,
    "user_id_str_ref" TEXT NOT NULL,
    "verified_purchase" BOOLEAN NOT NULL,
    "helpful_vote" INTEGER NOT NULL,
    "legitimacy_score" DOUBLE PRECISION,
    "spam_flag" BOOLEAN,
    "ai_analysis" TEXT,
    "time" TIMESTAMP(3) NOT NULL,
    "productId" INTEGER,
    "userId" INTEGER,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_user_id_string_key" ON "users"("user_id_string");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_seller_id_string_key" ON "sellers"("seller_id_string");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_seller_name_key" ON "sellers"("seller_name");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_no_key" ON "products"("product_no");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
