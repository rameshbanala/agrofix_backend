const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const orderService = require("../services/orderService");

const placeOrder = asyncHandler(async (req, res) => {
  const orderId = await orderService.placeOrder(req.user.id, req.body);
  res.status(201).json({ order_id: orderId });
});

const listMyOrders = asyncHandler(async (req, res) => {
  if (req.user.role === "admin") {
    throw new ApiError(403, "Admins cannot use this endpoint");
  }
  const orders = await orderService.getOrdersForBuyer(req.user.id);
  res.json(orders);
});

const getMyOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderForBuyer(req.params.id, req.user.id);
  res.json(order);
});

const cancelMyOrder = asyncHandler(async (req, res) => {
  await orderService.cancelOrder(req.params.id, req.user.id);
  res.json({ message: "Order cancelled successfully" });
});

const listAllOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getAllOrdersAdmin();
  res.json(orders);
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
  res.json(order);
});

module.exports = {
  placeOrder,
  listMyOrders,
  getMyOrder,
  cancelMyOrder,
  listAllOrders,
  updateStatus,
};
