process.env.DB_HOST = "localhost";
process.env.DB_NAME = "test";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "test";
process.env.JWT_SECRET = "test-secret";

// orderService requires config/db, which opens a pg Pool at module load —
// harmless here since we never issue a query in these pure-function tests.
const { resolveUnitPrice } = require("../src/services/orderService");

describe("resolveUnitPrice", () => {
  const product = { id: 1, unit_price: 40 };
  const tiers = [
    { product_id: 1, min_quantity: 10, unit_price: 35 },
    { product_id: 1, min_quantity: 50, unit_price: 28 },
    { product_id: 2, min_quantity: 5, unit_price: 99 }, // a different product's tier
  ];

  test("uses the base price below every tier threshold", () => {
    expect(resolveUnitPrice(product, tiers, 5)).toBe(40);
  });

  test("uses the matching tier at its exact threshold", () => {
    expect(resolveUnitPrice(product, tiers, 10)).toBe(35);
  });

  test("uses the best (highest-threshold) tier that still qualifies", () => {
    expect(resolveUnitPrice(product, tiers, 75)).toBe(28);
  });

  test("does not apply another product's tiers", () => {
    expect(resolveUnitPrice(product, tiers, 100)).toBe(28);
    expect(resolveUnitPrice({ id: 3, unit_price: 10 }, tiers, 100)).toBe(10);
  });

  test("falls back to base price when there are no tiers at all", () => {
    expect(resolveUnitPrice(product, [], 1000)).toBe(40);
  });
});
