-- Bulk-quantity pricing: a product may define price breaks at minimum
-- order quantities (e.g. 10+ units at a lower per-unit price). Orders pick
-- the best-matching tier for the quantity purchased; below every tier's
-- min_quantity, products.unit_price is used as the base price.
CREATE TABLE IF NOT EXISTS product_price_tiers (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price > 0),
  UNIQUE (product_id, min_quantity)
);

CREATE INDEX IF NOT EXISTS idx_price_tiers_product_id ON product_price_tiers (product_id);
