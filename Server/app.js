require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const app = express();
const path = require("path");
require('express-async-errors');

app.use(express.json()); // JSON parsing for other routes
// const _dirname = path.dirname('');
// const buildPath = path.join(_dirname,"../Client/build")
// app.use(express.static(buildPath))

const authMiddleware = require('./middleware/authentication');
const { bill } = require('./services/StripeService');
const { mandateStatus } = require('./services/GocardlessService');

// Extra security packages
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');

// Error handlers
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

// Routers
const authRouter = require('./routes/authRoute');
const addressRouter = require('./routes/addressRoute');
const serviceRouter = require('./routes/serviceRoute');
const mandateRouter = require('./routes/mandateRoute');
const orderRouter = require('./routes/orderRoute');
const productRouter = require('./routes/productRoute');
const userRouter = require('./routes/userRoute');
const couponRouter = require('./routes/discountCouponRoute');

// DB connection
const connectDB = require('./db/connect');

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "*", "data:", "blob:"],
      "connect-src": ["'self'", "*"],
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));

// Updated CORS configuration
const corsOptions = {
  origin: ['https://pine-vox-front.vercel.app', 'http://localhost:3006','https://myaccount.pinevox.com', 'http://myaccount.pinevox.com', process.env.VM_FrontendURL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(xss());

// Raw body parser for Stripe webhook
app.post('/api/v1/webhook/stripe', bodyParser.raw({ type: 'application/json' }), bill);
app.post('/api/v1/webhook/gocardless', bodyParser.raw({ type: 'application/json' }), mandateStatus);

// API routes
app.get('/api/home', (req, res) => {
  res.status(200).json('Welcome, your app is working well');
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/address', authMiddleware, addressRouter);
app.use('/api/v1/services', authMiddleware, serviceRouter);
app.use('/api/v1/mandate', authMiddleware, mandateRouter);
app.use('/api/v1/order', authMiddleware, orderRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/user', authMiddleware, userRouter);
app.use('/api/v1/coupon', couponRouter);

// // Serve static files from the React app
// app.use(express.static(path.join(__dirname, '../Client/build')));

// // Catch-all route for the React app
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../Client/build/index.html'));
// });

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// Start the server
const port = process.env.PORT || 3000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server listening on port ${port}...`);
    });
  } catch (error) {
    console.error(error);
  }
};

start();