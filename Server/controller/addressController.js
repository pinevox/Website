const Address = require("../models/Address");
const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const { NotFoundError, BadRequestError } = require("../errors");
const mongoose = require("mongoose");

const saveAddress = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { userId, username } = req.user;
    const addressData = { ...req.body, user: userId };

    const address = await Address.findOneAndUpdate(
      { user: userId }, // Filter: find the address document for this user
      addressData,
      { upsert: true, new: true, runValidators: true, session }
    );

    // Update the user status
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { status: 'remMandate' },
      { upsert: true, runValidators: true, new: true, session }
    );


    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(StatusCodes.CREATED)
      .json({
        address,
        msg: `Address updated successfully for user: ${username} with new status: ${user.status}`,
      });
  } catch (err) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    throw new BadRequestError(err);
  }
};

const findAddress = async (req, res) => {
  const { userId, username } = req.user;
  const addressData = await Address.findOne({ user: userId });
  if (!addressData) {
    throw new NotFoundError(`Address not found for user: ${username}`);
  }
  res.status(StatusCodes.OK).json(addressData.address);
};

module.exports = { saveAddress, findAddress };
