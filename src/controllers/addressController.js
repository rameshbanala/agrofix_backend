const asyncHandler = require("../utils/asyncHandler");
const addressService = require("../services/addressService");

const list = asyncHandler(async (req, res) => {
  const addresses = await addressService.listAddresses(req.user.id);
  res.json(addresses);
});

const create = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user.id, req.body);
  res.status(201).json(address);
});

const remove = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.user.id, req.params.id);
  res.json({ message: "Address deleted" });
});

const setDefault = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultAddress(req.user.id, req.params.id);
  res.json(address);
});

module.exports = { list, create, remove, setDefault };
