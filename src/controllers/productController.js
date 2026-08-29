const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const productService = require("../services/productService");
const imageUploadService = require("../services/imageUploadService");
const csvImportService = require("../services/csvImportService");

const list = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.validatedQuery);
  res.json(result);
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await productService.listCategories();
  res.json(categories);
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

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No image file uploaded");
  const url = await imageUploadService.uploadImageBuffer(req.file.buffer);
  res.json({ image_url: url });
});

const importCsv = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No CSV file uploaded");
  const { valid, errors } = csvImportService.parseProductsCsv(req.file.buffer);
  const result = await productService.bulkCreateProducts(valid);
  res.json({
    createdCount: result.createdCount,
    errors: [...errors, ...result.failed],
  });
});

module.exports = { list, listCategories, getOne, create, update, remove, uploadImage, importCsv };
