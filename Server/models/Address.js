const mongoose = require('mongoose');

const AddressSchema = mongoose.Schema({
    address:{
        company_address:{
            line_1: {
                type: String,
                required: [true, "Please provide an address"]
            },
            line_2: {
                type: String,
                required: false
            },
            city: {
                type: String,
                required: [true, "Please provide the city name"]
            },
            district: {
                type: String,
                required: false
            },
            county: {
                type: String,
                required: false
            },
            country: {
                type: String,
                required: [true, "Please provide the country name"]
            },
            post_code:{
                type: String,
                required: [true, "Please provide a post code"]
            }
        },
        billing_address:{
            line_1: {
                type: String,
                required: [true, "Please provide an address"]
            },
            line_2: {
                type: String,
                required: false
            },
            city: {
                type: String,
                required: [true, "Please provide the city name"]
            },
            district: {
                type: String,
                required: false
            },
            county: {
                type: String,
                required: false
            },
            country: {
                type: String,
                required: [true, "Please provide the country name"]
            },
            post_code:{
                type: String,
                required: [true, "Please provide a post code"]
            }
        },
        delivery_address:{
            line_1: {
                type: String,
                required: [true, "Please provide an address"]
            },
            line_2: {
                type: String,
                required: false
            },
            city: {
                type: String,
                required: [true, "Please provide the city name"]
            },
            district: {
                type: String,
                required: false
            },
            county: {
                type: String,
                required: false
            },
            country: {
                type: String,
                required: [true, "Please provide the country name"]
            },
            post_code:{
                type: String,
                required: [true, "Please provide a post code"]
            }
        },
    },
    user:{
        type: mongoose.Types.ObjectId, //Join with another doc's object ID
        ref: "User", //which model are we referencing
        required: [true, "Please provide a user"],
        unique: true
    }
    // shipping_building:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // shipping_street:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // shipping_landmark:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // shipping_city:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // shipping_state:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // shipping_zip:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // shipping_country:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // company_building:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // company_street:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // company_landmark:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // company_city:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // company_state:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // company_zip:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // company_country:{
    //     type: String,
    //     required: [true, "Please provide a name"],
    //     minlength: 1,
    //     maxlength: 50,
    // },
    // user:{
    //     type: mongoose.Types.ObjectId, //Join with another doc's object ID
    //     ref: "User", //which model are we referencing
    //     required: [true, "Please provide a user"],
    //     unique: true
    // }
})

module.exports = mongoose.model("Address", AddressSchema);