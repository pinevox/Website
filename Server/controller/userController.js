const User = require("../models/User");
const { NotFoundError, BadRequestError } = require("../errors");
const { StatusCodes } = require("http-status-codes");

const getUserDetails = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const userDetails = await User.findOne({ userEmail });
    if (!userDetails) {
      throw new NotFoundError("User not found");
    }

    res.status(StatusCodes.OK).json(userDetails);
  } catch (error) {
    throw new BadRequestError("Error fetch user details. Please try again...");
  }
};

module.exports = {getUserDetails};