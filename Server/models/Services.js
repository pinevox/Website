const mongoose = require('mongoose');

const ServiceSchema = mongoose.Schema({
    userCount:{
        type: Number,
        min: [0, "User count must be at least 0"],
        default: 0
    },
    newNumber:{
        type: Boolean,
        default: true,
    },
    pstnCost:{
        type: Number,
        min: [0, "User count must be at least 0"],
        default: 0
    },
    adslCost:{
        type: Number,
        min: [0, "User count must be at least 0"],
        default: 0
    },
    callRecordingCost:{
        type: Number,
        min: [0, "User count must be at least 0"],
        default: 0
    },
    annexRental:{
        type: Number,
        min: [0, "User count must be at least 0"],
        default: 0
    },
    faxToEmailCost:{
        type: Number,
        min: [0, "User count must be at least 0"],
        default: 0
    },
    user:{
        type: mongoose.Types.ObjectId, //Join with another doc's object ID
        ref: "User", //which model are we referencing
        required: [true, "Please provide a user"],
    }
})

module.exports = mongoose.model("Services", ServiceSchema);