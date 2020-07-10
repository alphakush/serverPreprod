const mongoose = require('mongoose');
var validator = require('validator');

const managerID = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'User'
    }
}, {
    timestamps: true
});

const barTMPSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        trim: true,
        default: ''
    },
    description: {
        type: String,
        required: true,
    },
    tags: {
        type: Array,
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    latitude: {
        type: Number,
        required: true,
        trim: true,
    },
    longitude: {
        type: Number,
        required: true,
        trim: true,
    },
    phone: {
        type:String,
        required: true,
        trim: true,
    },
    image: {
        type: String,
        required: true,
    },
    product:{
        Array
    },
    manager: [managerID]
},{
    timestamps: true
});

//Suppression du mot de passe de la response.
barTMPSchema.methods.toJSON = function () {
    const user = this;
    const barObject = user.toObject()

    return barObject
}

// Generate unique LINK for reset password.
barTMPSchema.methods.generatePasswordReset = function() {
    const user = this;
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000; //expires in an hour
};

const BarsTMP = mongoose.model('BarTMP', barTMPSchema);
module.exports = BarsTMP;