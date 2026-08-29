const asyncHandler = require("../utils/asyncHandler");
const productService = require("../services/productService");

const list = asyncHandler(async (req, res) => {
  const products = await productService.listProducts();
  res.json(products);
});

const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.id);
  res.json(product);
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json(product);
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json(product);
});

const remove = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res.json({ message: "Product deleted successfully" });
});

module.exports = { list, getOne, create, update, remove };
