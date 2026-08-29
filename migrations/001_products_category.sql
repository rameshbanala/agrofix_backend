-- Adds a category to products, for catalogue filtering/search.
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
