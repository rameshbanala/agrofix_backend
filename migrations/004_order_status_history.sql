-- Tracks every status an order has passed through, for the buyer-facing
-- order timeline and admin auditing.
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history (order_id);

-- Backfill a history entry for every existing order's current status, so
-- old orders still render a (single-entry) timeline instead of an empty one.
INSERT INTO order_status_history (order_id, status, changed_at)
SELECT o.id, o.status, o.placed_at
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_status_history h WHERE h.order_id = o.id
);
