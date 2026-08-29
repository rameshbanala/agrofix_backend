# Migrations

Plain numbered SQL files, run in order. There's no migration runner wired up (the
project has no migration tracking table) — run these manually against your database
once, before or right after deploying this PR.

## How to run

**Option A — Neon SQL Editor**: open your project at https://console.neon.tech,
go to the SQL Editor, paste each file's contents in order (001, 002, 003, 004), and run.

**Option B — psql**, if you have a connection string:

```bash
for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

All statements use `IF NOT EXISTS`, so re-running them is safe (idempotent).

## What each one does

- `001_products_category.sql` — adds `products.category` for catalogue filtering.
- `002_addresses.sql` — new `addresses` table for saved buyer delivery addresses.
- `003_product_price_tiers.sql` — new `product_price_tiers` table for bulk-quantity pricing.
- `004_order_status_history.sql` — new `order_status_history` table for the order timeline,
  backfilled with one entry per existing order at its current status.
