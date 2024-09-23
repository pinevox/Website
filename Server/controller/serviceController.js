const Services = require("../models/Services");
const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const { NotFoundError, BadRequestError } = require("../errors");
const mongoose = require('mongoose');


const saveService = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { userId, username } = req.user;
    const serviceData = { ...req.body, user: userId };

    // Update or create the service
    const service = await Services.findOneAndUpdate(
      { user: userId },
      serviceData,
      { upsert: true, new: true, runValidators: true, session }
    );

    // Update the user status
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { status: 'remAddress' },
      { upsert: true, runValidators: true, new: true, session }
    );

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res
      .status(StatusCodes.CREATED)
      .json({ service, msg: `Service added successfully for user: ${username}`, user });
  } catch (error) {
    // Abort the transaction in case of error
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};


const findService = async (req, res) => {
  const { userId, username } = req.user;
  const service = await Services.findOne({ user: userId });
  if (!service) {
    throw new NotFoundError(`Services not found for user: ${username}`);
  }
  res.status(StatusCodes.OK).json({ service });
};

module.exports = { saveService, findService };
