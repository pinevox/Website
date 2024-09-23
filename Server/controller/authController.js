const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const BadRequestError = require("../errors/bad-request");
const { OAuth2Client } = require("google-auth-library");
const UnauthenticatedError = require("../errors/unauthenticated");
const transporter = require('../util/emailConfig');
const crypto = require('crypto');

const register = async (req, res) => {
  const user = await User.create({ ...req.body });
  const accessToken = user.createJwt();
  const refreshToken = user.createRefreshJwt();
  res
    .status(StatusCodes.CREATED)
    .json({ user: { name: user.firstName }, accessToken, refreshToken });
};

const refreshToken = async (req, res) => {
  const { userId } = req.user;
  if (!userId) {
    throw new BadRequestError("Unable to find user");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new UnauthenticatedError("Invalid userId");
  }

  const accessToken = user.createJwt();
  const newRefreshToken = user.createRefreshJwt();

  res.status(StatusCodes.OK).json({
    user: { name: user.firstName },
    accessToken,
    refreshToken: newRefreshToken,
  });
};

const login = async (req, res) => {
  const { userEmail, password } = req.body;
  if (!userEmail || !password) {
    throw new BadRequestError("Please provide email and password");
  }
  const user = await User.findOne({ userEmail });

  if (!user) {
    throw new UnauthenticatedError("Invalid credentials");
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    throw new UnauthenticatedError("Incorrect password");
  }

  const accessToken = user.createJwt();
  const refreshToken = user.createRefreshJwt();
  res
    .status(StatusCodes.OK)
    .json({ user: { name: user.firstName, status: user.status }, accessToken, refreshToken });
};

const googleAuth = async (req, res) => {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const { googleToken } = req.body;

  try {
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userEmail = payload.email;

    // Check if user exists in the database
    let user = await User.findOne({ userEmail });

    if (!user) {
      // If the user doesn't exist, you might want to create a new user
      throw new BadRequestError("User already exists");
    }

    // Generate JWT tokens
    const accessToken = user.createJwt();
    const refreshToken = user.createRefreshJwt();

    res.status(StatusCodes.OK).json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    throw new BadRequestError("Invalid Google Token");
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { userEmail } = req.body;
    const user = await User.findOne({ userEmail });

    if (!user) {
      return res.status(404).json({ message: 'No user with that email address' });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    try {
      await transporter.sendMail({
        to: user.userEmail,
        subject: 'Your password reset token (valid for 10 min)',
        text: message
      });

      res.status(200).json({ message: 'Token sent to email!' });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(StatusCodes.BAD_REQUEST).json({ message: `There was an error sending the email: ${err}` });
    }
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: 'An error occurred', error: error.message });
  }
};

// controllers/authController.js
const resetPassword = async (req, res) => {
  try {
    // Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // If token has not expired, and there is user, set the new password
    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired' });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log the user in, send JWT
    const token = user.createJwt();
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error: error.message });
  }
};

module.exports = { register, login, refreshToken, googleAuth, forgotPassword, resetPassword };
