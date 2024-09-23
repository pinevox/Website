const { StatusCodes } = require('http-status-codes');
const discountCoupon = require('../models/discountCoupon');
const {BadRequestError} = require('../errors/index');

const getCoupon = async (req, res) => {
    try {
        const {couponName} = req.params; 
        const coupon = await discountCoupon.findOne({name: couponName});
        res.status(StatusCodes.OK).json(coupon);
    } catch (error) {
        throw new BadRequestError("Error fetching coupon details. Please try again..");
    }
}

const saveCoupons = async (req, res) => {
    try {
        const coupons = Array.isArray(req.body) ? req.body : [req.body];
        
        const operations = coupons.map(coupon => {
            
            return {
                updateOne: {
                    filter: { name: coupon.name },
                    update: { $set: coupon },
                    upsert: true
                }
            };
        });

        const result = await discountCoupon.bulkWrite(operations);

        res.status(StatusCodes.OK).json({
            message: "Coupons saved successfully",
            result: result
        });
    } catch (error) {
        console.error("Error saving coupons:", error);
        res.status(StatusCodes.BAD_REQUEST).json({
            error: "Error saving or updating coupon details. Please try again."
        });
    }
}

const getAllCoupons = async (req, res) => {
    try {
        const coupons = await discountCoupon.find({});
        res.status(StatusCodes.OK).json({coupons});
    } catch (error) {
        throw new BadRequestError("Error fetching coupons. Please try again..");
    }
}

module.exports = {getCoupon , saveCoupons, getAllCoupons};
