const mongoose = require('mongoose');

const PackageSchema = mongoose.Schema({
    packageName:{
        type: String,
        enum: ['basic', 'standard', 'premium'],
        default: 'basic'
    },
    cost: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model('Package', PackageSchema);