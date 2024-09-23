const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authentication');
const { initiateMandate, gocardlessWebhook } = require('../controller/mandateController');

router.route('/billing').post(authMiddleware, initiateMandate);

module.exports = router;
