const express = require('express');
const mongoose = require('mongoose');
const config = require('../config');
const sharp = require('sharp')
const multer = require('multer');
const checkingAuth = require("../middlewares/checkingAuth");
const ArrayToString = require ('./base64ArrayBuffer');
const { contactEmail } = require('../emails/account');
var NodeGeocoder = require('node-geocoder');

const Bar = mongoose.model('Bar');
const router = express.Router();


var options = {
    provider: 'google',
    httpAdapter: 'https', 
    apiKey: process.env.GOOGLE_API_KEY,
    formatter: null
};

var geocoder = NodeGeocoder(options);

//con st {name, description, tags, address, note, products, phone } = userSend;
async function getResult (address) {

    const resultat = {}
    geocoder.geocode(address.toString())
        .then(function(resT) {
            
            const latitude = resT[0].latitude;
            const longitude = resT[0].longitude;
            resultat["latitude"] = latitude;
            resultat["longitude"] = longitude;

            return resultat;
            
         })
         .catch(function(err) {
             console.log(err);
        });
}

async function msg(address) {
    const res = await getResult(address);
    console.log("res : " +res);
    return res;
  }

//Acces to the screen, only for connected users
//router.use(checkingAuth);

// methods format the response
function createresponse(data) { 
    var result = [];

    for (const k in data) {
        if (data.hasOwnProperty(k)) {
            {
                var id = data[k]._id;
                var name = data[k].name;
                var description = data[k].description;
                var tags = data[k].tags;
                var address = data[k].address;
                var note = data[k].note;
                var image = data[k].image;
                var product = data[k].product;
                var latitude = data[k].latitude;
                var longitude = data[k].longitude;
                var imageToString = ArrayToString(image);
                result.push({ 'id': id,'name': name, 'description': description, 'tags': tags, 'address': address,'latitude': latitude, 'longitude': longitude, 'note': note,'image': imageToString, 'product': product });
            };
        }
    }
    return result;
} 

// Route pour obtenir tous les bars disponibles
router.get(config.rootAPI + '/allbars', async (req, res) => {
    const barFound = await Bar.find({});
    const result = createresponse(barFound);
    console.log("Get all bars");
    console.log(result);
    res.send(result);
});

//Route pour obtenur un bar par nom. Example barname: wallace
router.get(config.rootAPI + '/bar/:barname', async (req, res) => {
    const barName = req.params.barname;
    const barRegex = new RegExp("^" + barName, 'i');
    const barFound = await Bar.find({
        name: barRegex
    });
    const result = createresponse(barFound);
    res.send(result);
});

// Les conditions pour  uploader une image
const upload = multer({
    limits: {
        //Max of file 1Mo= 1000000 bytes.
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
            return cb(new Error("Votre image doit être moins 1 mo et de format png, jpg ou jpeg. Merci de bien vérifer ses informations"));
        }
        cb(undefined, true)
    }
});

// Router pour créer un bar. Il faut renseigner : nom, description, tags, téléphone, tags, téléphone du bar, addresse, produits et images.
router.post(config.rootAPI + '/bar/create-bar', upload.single('upload-bar'), async (req, res) => {
    try {
        const {name, description, tags, address, note, products, phone } = req.body;
        if(!name || !description ||  !tags || !address || !note || !products || !phone ){
            throw 'Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, téléphone,  addresse, produits et images';
        }
        const image = req.file.buffer;
        const imageCrop = await sharp(image).resize( 820,360, {fit: sharp.fit.inside, withoutEnlargement: true}).png().toBuffer();
        const resultat = {};
        //pour obtenir la longittude et latitude
        geocoder.geocode(address.toString())
        .then(function(resT) {
            resultat["latitude"] = resT[0].latitude;
            resultat["longitude"] = resT[0].longitude;
         })
         .then(async function() {
            const bar = new Bar({'name':name, description, tags, address, 'latitude': resultat.latitude,  'longitude' : resultat.longitude, phone, note, 'image': imageCrop, products });
            await bar.save();
            res.status(201).send({success: "OK"});
         })
         .catch(function(err) {
            res.status(422).send(err)
        });
        
    } catch (err) {
        res.status(422).send({error: '2. Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, addresse, produits et images' })
    }
}, (error, req, res, next) => {
    res.status(422).send({ error: error.message })
});

//Router pour nous contacter
router.post(config.rootAPI + '/contact-us', (req, res) => {
    try {
        const {email, message } = req.body;
        if(!email || !message) {
            throw 'Merci de compléter tous les champs (e-mail, password)';
        }
        contactEmail(email, message)
        res.status(200).send("OK");
    } catch (err) {
        res.status(422).send({error: "Votre message n'a pas pu être transmis."})
    }
});

module.exports = router;