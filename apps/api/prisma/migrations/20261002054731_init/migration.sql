-- CreateTable
CREATE TABLE "company" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote" (
    "company_id" INTEGER NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "previous_close" DECIMAL(18,6) NOT NULL,
    "change" DECIMAL(18,6) NOT NULL,
    "change_percent" DECIMAL(12,6) NOT NULL,
    "is_market_open" BOOLEAN NOT NULL,
    "market_timestamp" TIMESTAMPTZ(3) NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quote_pkey" PRIMARY KEY ("company_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_symbol_key" ON "company"("symbol");

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
