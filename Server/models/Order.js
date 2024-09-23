const mongoose = require('mongoose');

const OrderSchema = mongoose.Schema({
    totalAmount:{
        type: Number,
        min: [0, "Order amount cannot be less than 0"],
        required: [true, "Please provide a valid order amount"]
    },
    paymentStatus:{
        type: String,
        enum: ['pending', 'success', 'failed', 'cancelled'],
        default: 'pending'
    },
    user:{
        type: mongoose.Types.ObjectId,
        ref: "User", //which model are we referencing
        required: [true, "Please provide a user"],
    },
    address: {
        type: String,
        required: [true, "Please provide a valid address"]
    },
    orderDetails: [{
        item: {
            type: String,
            required: [true, "Please provide a product name"]
        },
        category:{
            type: String,
            required: false
        },
        retailPrice: {
            type: Number,
            required: [true, "Please provide a retail price"]
        },
        qty: {
            type: Number,
            required: [true, "Please provide a quantity"]
        }
    }],
    receipt:{
        type: String,
        required: false
    }
},{timestamps: true})

module.exports = mongoose.model("Order", OrderSchema);