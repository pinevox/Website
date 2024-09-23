const Order = require("../models/Order");
const { StatusCodes } = require("http-status-codes");
const { stripeService } = require('../services/StripeService')

//Save order
const saveOrder = async (req, res) => {
  try {
    const { userId, userEmail } = req.user;
    const { cart, address } = req.body;

    // Calculate total amount
    const totalAmount = cart.reduce(
      (sum, item) => sum + item.retail_price * item.qty,
      0
    );

    // Prepare order details
    const orderDetails = cart.map((item) => ({
      item: item.item,
      category: item.Catergory,
      retailPrice: item.retail_price,
      category: item.Catergory,
      retailPrice: item.retail_price,
      qty: item.qty,
    }));

    // Create the order
    const order = await Order.create({
      totalAmount,
      user: userId,
      address,
      orderDetails,
    });

    // Create Stripe checkout session
    const session = await stripeService(orderDetails, order._id, userEmail);

    res.status(StatusCodes.CREATED).json({ order, sessionUrl: session.url });
  } catch (error) {
    console.error("Error saving order:", error);
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Error saving order", error: error.message });
  }
};

//Get orders
const getOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.userId });
  res.status(StatusCodes.OK).json({ orders });
}


module.exports = { saveOrder, getOrders };
