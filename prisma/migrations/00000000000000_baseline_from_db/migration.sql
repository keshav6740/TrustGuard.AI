-- CreateTable
CREATE TABLE "Analysis" (
    "analysis_id" INTEGER NOT NULL,
    "product_no" BIGINT,
    "score" DOUBLE PRECISION,
    "reasoning" TEXT,
    "review_id" BIGINT,
    "time" TIME(6),

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("analysis_id")
);

-- CreateTable
CREATE TABLE "Items" (
    "category" TEXT,
    "title" TEXT,
    "rating" DOUBLE PRECISION,
    "rating_number" BIGINT,
    "description" TEXT,
    "price" BIGINT,
    "seller_id" TEXT,
    "product_no" BIGINT NOT NULL,
    "verified_product" BOOLEAN,
    "image" TEXT,

    CONSTRAINT "Items_pkey" PRIMARY KEY ("product_no")
);

-- CreateTable
CREATE TABLE "Reviews" (
    "title" TEXT,
    "text" TEXT,
    "product_no" BIGINT,
    "user_id" TEXT,
    "review_id" BIGINT NOT NULL,
    "helpful_vote" BIGINT,
    "date_time" TEXT,

    CONSTRAINT "Reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "Sellers" (
    "seller_id" TEXT NOT NULL,
    "seller_name" TEXT,
    "total_products" BIGINT,
    "is_verified" BOOLEAN,

    CONSTRAINT "Sellers_pkey" PRIMARY KEY ("seller_id")
);

-- CreateTable
CREATE TABLE "Users" (
    "user_id" TEXT NOT NULL,
    "username" TEXT,
    "total_reviews" BIGINT,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_product_no_fkey" FOREIGN KEY ("product_no") REFERENCES "Items"("product_no") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Reviews"("review_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Items" ADD CONSTRAINT "Items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "Sellers"("seller_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_product_no_fkey" FOREIGN KEY ("product_no") REFERENCES "Items"("product_no") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

