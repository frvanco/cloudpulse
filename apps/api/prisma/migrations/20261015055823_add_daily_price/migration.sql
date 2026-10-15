-- CreateTable
CREATE TABLE "daily_price" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(18,6) NOT NULL,
    "high" DECIMAL(18,6) NOT NULL,
    "low" DECIMAL(18,6) NOT NULL,
    "close" DECIMAL(18,6) NOT NULL,
    "volume" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_price_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_price_company_id_date_key" ON "daily_price"("company_id", "date");

-- AddForeignKey
ALTER TABLE "daily_price" ADD CONSTRAINT "daily_price_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
