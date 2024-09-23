const axios = require("axios");
const Order = require("../models/Order");
const { StatusCodes } = require("http-status-codes");
const stripe = require("stripe")(process.env.STRIPE_KEY);
const generateOrderXml = require("../util/generateOrderXML");
const User = require("../models/User");
const { NotFoundError } = require("../errors/index");
const mongoose = require("mongoose");

const stripeService = async (orderDetails, orderId, userEmail) => {
  const lineItems = orderDetails.map((item) => ({
    price_data: {
      currency: "GBP",
      product_data: {
        name: item.item,
        description: (item.description || `Quantity: ${item.qty}`) + ". 20% VAT applicable.", // Add description here
      },
      unit_amount: Math.round(item.retailPrice * 100 * 1.2), // Stripe expects amount in cents
    },
    quantity: item.qty,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: userEmail, // Add customer email to send receipt
    mode: "payment",
    client_reference_id: orderId.toString(),
    metadata: {
      order_id: orderId.toString(),
    },
    success_url: `${process.env.YOUR_DOMAIN}/PaymentSuccess?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.YOUR_DOMAIN}/PaymentFailure`,
  });

  return session;
};

const bill = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook Error:", err.message);
    console.log("Stripe-Signature header:", sig);
    console.log(
      "Webhook Secret:",
      process.env.STRIPE_WEBHOOK_SECRET.substring(0, 5) + "..."
    );
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "charge.updated":
        await addPaymentReceipt(event.data.object);
        break;
      case "checkout.session.completed":
        await handleCheckoutSession(event.data.object, "success");
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutSession(event.data.object, "cancelled");
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    console.log("Order processed successfully");
    res.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    res.status(500).send("Error handling webhook");
  }
};

//Handle
const handleCheckoutSession = async (session, status) => {
  const clientReferenceId = session.client_reference_id;
  console.log("Client Reference ID:", clientReferenceId);

  if (clientReferenceId) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(clientReferenceId).session(session);

        if (order && order.paymentStatus === "pending") {
          order.paymentStatus = status;
          await order.save({ session });
          console.log("Order status updated to:", status);

          // Place order with Provu within the same transaction
          await placeOrder(order);
        } else {
          console.log(
            "Order not found or already processed:",
            clientReferenceId
          );
        }
      });
    } catch (err) {
      console.error("Error updating order:", err);
    } finally {
      session.endSession();
    }
  } else {
    console.log("Client Reference ID not found in the session");
  }
};

//Handle payment failure
const handlePaymentFailure = async (paymentIntent) => {
  const clientReferenceId = paymentIntent.metadata.order_id;
  console.log("Client Reference ID:", clientReferenceId);

  if (clientReferenceId) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(clientReferenceId).session(session);

        if (order && order.paymentStatus === "pending") {
          order.paymentStatus = "failed";
          await order.save({ session });
          console.log("Order status updated to: failed");
        } else {
          console.log(
            "Order not found or already processed:",
            clientReferenceId
          );
        }
      });
    } catch (err) {
      console.error("Error updating order:", err);
    } finally {
      session.endSession();
    }
  } else {
    console.log("Payment Intent ID not found in the session");
  }
};

//Update receipt URL
const addPaymentReceipt = async (charge) => {
  const receiptUrl = charge.receipt_url;
  const paymentIntentId = charge.payment_intent;

  console.log("Payment Receipt URL:", receiptUrl);

  if (!paymentIntentId) {
    console.log("Payment Intent ID not found in the charge");
    return;
  }

  try {
    const clientReferenceId = await getClientReferenceId(paymentIntentId);
    if (!clientReferenceId) {
      console.log("Client Reference ID not found");
      return;
    }

    await updateOrderReceipt(clientReferenceId, receiptUrl);
  } catch (err) {
    res
      .status(StatusCodes.EXPECTATION_FAILED)
      .json({ msg: `Error updated payment receipt in order: ${err}` });
  }
};

const getClientReferenceId = async (paymentIntentId) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent.id,
    limit: 1,
  });

  if (sessions.data.length === 0) {
    console.log("No associated Checkout Session found");
    return null;
  }

  return sessions.data[0].client_reference_id;
};

const updateOrderReceipt = async (clientReferenceId, receiptUrl) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(clientReferenceId).session(session);

      if (!order) {
        console.log("Order not found:", clientReferenceId);
        return;
      }

      order.receipt = receiptUrl;
      await order.save({ session });
      console.log("Order receipt URL updated:", receiptUrl);
    });
  } catch (err) {
    console.error("Error updating order receipt:", err);
  } finally {
    session.endSession();
  }
};

//place order with Provu
const placeOrder = async (order) => {
  const user = await User.findById(order.user);
  if (!user) {
    throw NotFoundError("User not found");
  }
  const apiUrl = "https://secure.provu.co.uk/prosys/xml.php";
  const xmlPayload = generateOrderXml(order, user);
  console.log(order);
  console.log(xmlPayload);

  const username = process.env.PROVU_USER;
  const password = process.env.PROVU_PASS;

  try {
    const response = await axios.post(apiUrl, xmlPayload, {
      headers: {
        'Content-Type': 'application/xml'
      },
      auth: {
        username: username,
        password: password
      }
    });

    if (response.status === 200) {
      console.log("Order placed successfully with third-party API");
      return response.data;
    } else {
      console.log(
        "Failed to place order with third-party API. Status code:",
        response.status
      );
      throw new Error("Failed to place order");
    }
  } catch (error) {
    console.error("Error placing order with third-party API:", error);
    throw error;
  }
};

module.exports = { stripeService, bill };
