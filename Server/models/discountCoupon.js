const mongoose = require('mongoose');

const discountCouponSchema = mongoose.Schema({
    name: String,
    description: String,
    // couponType: {
    //     type: String,
    //     enum: ['activation', 'totalPrice'],
    //     default: 'totalPrice'
    // },
    monthlyDiscount: Number,
    activationDiscount: Number,
    expiry:{
        type: String,
        required: false
    }
},{timestamps: true});

module.exports = mongoose.model("discountCoupon" , discountCouponSchema);