const mongoose = require('mongoose');
var validator = require('validator');

const commentBarSchena = new mongoose.Schema({
    comment: {
        type: String,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userNote: {
      type: Number
    }
}, {
    timestamps: true
});

const barSchema = new mongoose.Schema({
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
    note:{
        type: Number,
        min: 0,
        max: 5
    },
    image: {
        type: String,
        required: true,
    },
    product:{
        Array
    },
    managerID: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    commentaire: [commentBarSchena],
    counterLike:{
        type: Number,
        validate(value){
            if(value < 0 ){
                throw new Error('Le nombre de LIKE doit être positive');
            }
        },
        default: 0
    },
    counterComment:{
        type: Number,
        validate(value){
            if(value < 0 ){
                //TODO ajouter LIKE
                throw new Error('Le nombre de LIKE doit être positive');
            }
        },
        default: 0
    },
},{
    timestamps: true
});

const Bar = mongoose.model('Bar', barSchema);
module.exports = Bar;

//mongoose.model('Bar',barSchema);
