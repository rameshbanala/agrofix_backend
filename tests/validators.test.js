const { signupSchema, loginSchema } = require("../src/validators/authValidators");
const {
  createProductSchema,
  listProductsQuerySchema,
} = require("../src/validators/productValidators");
const { createOrderSchema } = require("../src/validators/orderValidators");

describe("authValidators", () => {
  test("signupSchema rejects a short password", () => {
    const { error } = signupSchema.validate({
      name: "Jane",
      email: "jane@example.com",
      password: "short",
    });
    expect(error).toBeDefined();
  });

  test("signupSchema accepts valid input and lowercases email", () => {
    const { error, value } = signupSchema.validate({
      name: "Jane",
      email: "JANE@Example.com",
      password: "password123",
    });
    expect(error).toBeUndefined();
    expect(value.email).toBe("jane@example.com");
  });

  test("loginSchema requires email and password", () => {
    const { error } = loginSchema.validate({ email: "jane@example.com" });
    expect(error).toBeDefined();
  });
});

describe("productValidators", () => {
  test("createProductSchema requires name and unit_price", () => {
    const { error } = createProductSchema.validate({ description: "no name or price" });
    expect(error).toBeDefined();
  });

  test("createProductSchema accepts price_tiers", () => {
    const { error, value } = createProductSchema.validate({
      name: "Tomatoes",
      unit_price: 40,
      price_tiers: [{ min_quantity: 10, unit_price: 35 }],
    });
    expect(error).toBeUndefined();
    expect(value.price_tiers).toHaveLength(1);
  });

  test("listProductsQuerySchema defaults page/limit/sort and coerces types", () => {
    const { error, value } = listProductsQuerySchema.validate({ page: "2", limit: "10" });
    expect(error).toBeUndefined();
    expect(value.page).toBe(2);
    expect(value.limit).toBe(10);
    expect(value.sort).toBe("newest");
  });

  test("listProductsQuerySchema rejects page below 1", () => {
    const { error } = listProductsQuerySchema.validate({ page: 0 });
    expect(error).toBeDefined();
  });
});

describe("orderValidators", () => {
  test("createOrderSchema requires at least one item", () => {
    const { error } = createOrderSchema.validate({
      delivery_address: "123 Main St",
      items: [],
    });
    expect(error).toBeDefined();
  });

  test("createOrderSchema rejects a non-positive quantity", () => {
    const { error } = createOrderSchema.validate({
      delivery_address: "123 Main St",
      items: [{ product_id: 1, quantity: 0 }],
    });
    expect(error).toBeDefined();
  });

  test("createOrderSchema accepts valid items", () => {
    const { error } = createOrderSchema.validate({
      delivery_address: "123 Main St",
      items: [{ product_id: 1, quantity: 5 }],
    });
    expect(error).toBeUndefined();
  });
});
