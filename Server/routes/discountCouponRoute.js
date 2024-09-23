const express = require('express');
const { getCoupon, saveCoupons, getAllCoupons } = require('../controller/discountCouponController');

const router = express.Router();

router.route('/').get(getAllCoupons).patch(saveCoupons);
router.route('/:couponName').get(getCoupon);

module.exports = router;