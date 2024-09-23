const jwt = require("jsonwebtoken");
const UnauthenticatedError = require("../errors/unauthenticated");

const authMiddleware = (req, res, next) => {
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
    const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthenticatedError("Invalid or Missing Token");
  }

  const token = authHeader.split(" ")[1];

  console.log(token);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log(payload)
    const { userId, username, userEmail } = payload;
    req.user = { userId, username, userEmail };
    next();
  } catch (error) {
    throw new UnauthenticatedError("Invalid Credentials");
  }
};

module.exports = authMiddleware;
