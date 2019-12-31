const mongoose = require('mongoose');

const commentBarSchena = new mongoose.Schema({
    barid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bar'
    },
    comment: {
        type: String,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
        validate(value){
            if(value < 0 ){
                //TODO ajouter étoile 1,2,..5 numérateur[note]/dénominateur[nb de personnes qui vote + 1]
                throw new Error('La note doit être positive');
            }
        }
    },
    image: {
        type: Buffer,
        required: true
    },
    product:{
        Array
    },
    managerID: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    comment: [commentBarSchena]
},{
    timestamps: true
});

mongoose.model('Bar',barSchema);