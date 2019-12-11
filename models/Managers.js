const mongoose = require('mongoose');

const managerSchema = new mongoose.Schema({
    managerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    }
});

mongoose.model('Manager',managerSchema);