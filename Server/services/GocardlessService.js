const GoCardlessClient = require("gocardless-nodejs");
const webhooks = require("gocardless-nodejs/webhooks");
const Mandate = require("../models/Mandate");
const User = require("../models/User");
const NotFoundError = require("../errors/not-found");
const gocardless = require("gocardless-nodejs");
const constants = require("gocardless-nodejs/constants");
const crypto = require("crypto");
const { StatusCodes } = require("http-status-codes");

const redirectUrl = process.env.REDIRECT_URL;
const accessToken = process.env.GOCARDLESS_ACCESS_TOKEN;
const webhookToken = process.env.GOCARDLESS_WEBHOOK_TOKEN;
const gocardlessEnvironment = process.env.GOCARDLESS_ENVIRONMENT

const client = gocardless(accessToken, constants.Environments[gocardlessEnvironment], {
  raiseOnIdempotencyConflict: true,
});

const createBillingRequest = async (billingRequestDTO) => {
  return await client.billingRequests.create({
    payment_request: {
      description: billingRequestDTO.description,
      amount: billingRequestDTO.amount,
      currency: "GBP",
      app_fee: billingRequestDTO.appFee,
    },
    mandate_request: {
      scheme: "bacs",
      recurrence: "recurring", // Added this line
    },
  });
};

const createRequestFlow = async (billId) => {
  return await client.billingRequestFlows.create({
    redirect_uri: `${redirectUrl}/PaymentSuccess`,
    exit_uri: `${redirectUrl}/PaymentFailure`,
    links: {
      billing_request: billId,
    },
  });
};

const initializeMandate = async (billingRequestDTO) => {
  const { userEmail } = billingRequestDTO;

  const user = await User.findOne({ userEmail: userEmail });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  console.log(billingRequestDTO);

  const billingRequest = await createBillingRequest(billingRequestDTO);
  const billId = billingRequest.id;

  const billingRequestFlow = await createRequestFlow(billId);
  const authorisationUrl = billingRequestFlow.authorisation_url;

  const mandateData = {
    aPackage: billingRequestDTO.description,
    service: user.services,
    mandateDate: new Date(),
    mandateStatus: "pending",
    totalAmount: billingRequestDTO.amount,
    monthlySub:billingRequestDTO.monthlyCost,
    gocardlessBillId: billId, // This is actually the billing request ID
    user: user._id,
  };

  const newMandate = new Mandate(mandateData);
  await newMandate.save();
  
  await User.findOneAndUpdate(
    { userEmail},
    {status : 'active'},
    {upsert:true, new: true, runValidators:true}
  )

  console.log(`user status changed to : ${user.status}`)

  // await Mandate.findOneAndUpdate(
  //   { user: user._id },
  //   mandateData,
  //   {
  //     new: true,
  //     runValidators: true,
  //     upsert: true,
  //     setDefaultsOnInsert: true,
  //   }
  // );

  return authorisationUrl;
};

const mandateStatus = async (req, res) => {
  try {
    const signatureHeader = req.headers["webhook-signature"];
    const rawBody = req.body; // This will be a Buffer

    if (!signatureHeader || !webhookToken || !rawBody) {
      console.error("Missing required data for webhook validation");
      return res.status(400).json({ msg: "Bad Request" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookToken)
      .update(rawBody)
      .digest("hex");

    if (signatureHeader !== expectedSignature) {
      console.error("Signature mismatch");
      return res.status(400).json({ msg: "Invalid Signature" });
    }

    // If signatures match, parse the body
    const jsonBody = JSON.parse(rawBody.toString("utf8"));

    // Process events without using the GoCardless library's parse function
    let responseBody = "";
    for (const event of jsonBody.events) {
      responseBody += await processEvent(event);
    }

    res.status(StatusCodes.OK).json({ msg: "success", responseBody });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: "Server Error" });
  }
};

const processEvent = async (event) => {
  switch (event.resource_type) {
    case "mandates":
      return await processMandate(event);
    case "subscriptions":
      return await processSubscription(event);
    default:
      return `Don't know how to process an event of resource_type ${event.resource_type}.\n`;
  }
};

// Modify the processMandate function
const processMandate = async (event) => {
  const mandateId = event.links.mandate;
  const billingRequestId = event.links.billing_request;
  let mandate = await Mandate.findOne({ gocardlessBillId: billingRequestId });

  if (!mandate) {
    try {
      mandate = await Mandate.findOne({ gocardlessMandateId: mandateId });
    } catch (err) {
      console.log(
        `Mandate not found in our database for billing request ${billingRequestId}`
      );
      return `Mandate not found for billing request ${billingRequestId}.\n`;
    }
  }

  console.log(
    `Processing mandate event: ${event.action} for mandate ${mandateId}`
  );

  switch (event.action) {
    case "created":
    case "active":
      mandate.gocardlessMandateId = mandateId;
      await mandate.save();

      const mandateDetails = await client.mandates.find(mandateId);

      if (mandateDetails.scheme === "bacs" && !mandate.subscriptionId) {
        console.log(
          `Recurring mandate ${mandateId} activated, attempting to create subscription`
        );
        try {
          await confirmMandateAndCreateSubscription(mandate);
          console.log("Subscription created successfully");
          return `Recurring mandate ${mandateId} activated and subscription created.\n`;
        } catch (error) {
          console.error("Failed to create subscription:", error.message);
          return `Recurring mandate ${mandateId} activated but subscription creation failed: ${error.message}\n`;
        }
      } else if (mandate.subscriptionId) {
        console.log("Subscription already exists for this mandate");
        return `Recurring mandate ${mandateId} activated, subscription already exists.\n`;
      } else {
        console.log(
          `One-time mandate ${mandateId} activated, no subscription needed`
        );
        return `One-time mandate ${mandateId} activated.\n`;
      }
    case "consumed":
      console.log(
        `Mandate ${mandateId} consumed. This is likely a temporary mandate.`
      );
      return `Mandate ${mandateId} consumed.\n`;
    case "failed":
    case "cancelled":
    case "expired":
    case "blocked":
      mandate.mandateStatus = event.action;
      console.log(`Mandate ${mandateId} ${event.action}`);
      await mandate.save();
      return `Mandate ${mandateId} ${event.action}.\n`;
    default:
      return `Unhandled mandate event action: ${event.action} for mandate ${mandateId}.\n`;
  }
};

const createSubscription = async (
  mandateId,
  subAmount,
  interval,
  maxRetries = 5
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mandateDetails = await client.mandates.find(mandateId);
      if (mandateDetails.status !== "active") {
        console.log(
          `Attempt ${attempt}: Mandate ${mandateId} is not active. Current status: ${mandateDetails.status}`
        );
        if (attempt === maxRetries) {
          throw new Error(
            `Mandate ${mandateId} is not in active state after ${maxRetries} attempts`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 2 seconds before retrying
        continue;
      }

      console.log(
        `Attempt ${attempt}: Creating subscription for mandate ${mandateId}`
      );
      const subscription = await client.subscriptions.create({
        amount: subAmount,
        currency: "GBP",
        name: "Monthly subscription",
        interval: 1,
        interval_unit: interval,
        links: {
          mandate: mandateId,
        },
      });

      console.log(`Subscription created successfully: ${subscription.id}`);
      return subscription;
    } catch (error) {
      console.error(
        `Attempt ${attempt}: Error creating subscription for ${mandateId}:`,
        error.message
      );
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve,1000)); // Wait 2 seconds before retrying
    }
  }
};

const confirmMandateAndCreateSubscription = async (mandate) => {
  try {
    console.log("Confirming mandate status before creating subscription");
    const gcMandateDetails = await client.mandates.find(
      mandate.gocardlessMandateId
    );

    if (gcMandateDetails.status !== "active") {
      console.log(
        `Mandate ${mandate.gocardlessMandateId} is not active. Current status: ${gcMandateDetails.status}`
      );
      throw new Error(
        `Mandate is not active. Status: ${gcMandateDetails.status}`
      );
    }

    // Check if a subscription already exists
    const existingSubscriptions = await client.subscriptions.list({
      mandate: mandate.gocardlessMandateId,
    });

    if (existingSubscriptions.subscriptions.length > 0) {
      console.log("Subscription already exists for this mandate");
      mandate.subscriptionId = existingSubscriptions.subscriptions[0].id;
      await mandate.save();
      return existingSubscriptions.subscriptions[0];
    }

    console.log(
      "Creating new subscription for mandate:",
      mandate.gocardlessMandateId
    );
    const subscription = await createSubscription(
      mandate.gocardlessMandateId,
      mandate.monthlySub || mandate.totalAmount,
      "monthly"
    );

    console.log("Subscription created:", subscription.id);
    mandate.mandateStatus = "active";
    mandate.subscriptionId = subscription.id;
    await mandate.save();

    return subscription;
  } catch (error) {
    console.error(
      "Error confirming mandate or creating subscription:",
      error.message
    );
    throw error;
  }
};

const processSubscription = async (event) => {
  const subscriptionId = event.links.subscription;
  console.log(`Processing subscription event: ${event.action} for subscription ${subscriptionId}`);

  try {
    // Find the mandate associated with this subscription
    const mandate = await Mandate.findOne({ subscriptionId: subscriptionId });

    if (!mandate) {
      console.log(`No mandate found for subscription ${subscriptionId}`);
      return `No mandate found for subscription ${subscriptionId}.\n`;
    }

    switch (event.action) {
      case "created":
        console.log(`Subscription ${subscriptionId} created`);
        mandate.subscriptionStatus = "active";
        await mandate.save();
        return `Subscription ${subscriptionId} created and mandate updated.\n`;

      case "payment_created":
        console.log(`Payment created for subscription ${subscriptionId}`);
        // You might want to store payment information or update user's payment history here
        return `Payment created for subscription ${subscriptionId}.\n`;

      case "payment_submitted":
        console.log(`Payment submitted for subscription ${subscriptionId}`);
        return `Payment submitted for subscription ${subscriptionId}.\n`;

      case "payment_confirmed":
        console.log(`Payment confirmed for subscription ${subscriptionId}`);
        // Update user's payment status or trigger any post-payment processes
        return `Payment confirmed for subscription ${subscriptionId}.\n`;

      case "payment_failed":
        console.log(`Payment failed for subscription ${subscriptionId}`);
        // Handle failed payment - maybe notify the user or try again
        return `Payment failed for subscription ${subscriptionId}. Action may be required.\n`;

      case "cancelled":
        console.log(`Subscription ${subscriptionId} cancelled`);
        mandate.subscriptionStatus = "cancelled";
        await mandate.save();
        // You might want to update user's subscription status or take other actions
        return `Subscription ${subscriptionId} cancelled and mandate updated.\n`;

      default:
        console.log(`Unhandled subscription event action: ${event.action} for subscription ${subscriptionId}`);
        return `Unhandled subscription event: ${event.action} for ${subscriptionId}.\n`;
    }
  } catch (error) {
    console.error(`Error processing subscription event for ${subscriptionId}:`, error);
    return `Error processing subscription event for ${subscriptionId}: ${error.message}\n`;
  }
};

module.exports = { initializeMandate, mandateStatus };
