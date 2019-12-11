const mongoose = require('mongoose');

const barSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    tags: {
        type: Array,
    },
    adress: {
        type: String,
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
        required: false
    }
});

mongoose.model('Bar',barSchema);