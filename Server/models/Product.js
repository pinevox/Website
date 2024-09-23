const mongoose = require("mongoose");

const ProductSchema = mongoose.Schema({
    item:{
        type: String,
        unique: true,
        required: [true, "Please provide a unique product name"]
    },
    description:{
        type: String,
        required: false
    },
    class: {
        type: String,
        required: false
    },
    free_stock: {
        type: Number,
        min: 0,
        required: [true, "Please provide a valid stock amount"]
    },
    retail_price: {
        type: Number,
        min: 0,
        required: [true, "Please provide a valid retail price"]
    },
    image_url: {
        type: String,
        required: false
    },
    availability: {
        type: String,
        enum: ['current', 'EOL'],
        default: 'current'
    }
})

module.exports = mongoose.model("Products" , ProductSchema);
