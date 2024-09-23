const express = require('express');
const router = express.Router();
const { saveOrder, getOrders } = require('../controller/orderController')


router.route('/').post(saveOrder).get(getOrders);

module.exports = router;