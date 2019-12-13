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
    httpAdapter: 'https', // Default
    apiKey: process.env.GOOGLE_API_KEY, // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
};

var geocoder = NodeGeocoder(options);

async function getResult (address) {
    //con st {name, description, tags, address, note, products, phone } = userSend;

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

router.post(config.rootAPI + '/test-geolocalisation', async (req, res) => {
    try {
        const {address } = req.body;
        if(!address) {
            throw 'adresse manquante';
        }

        const resultat = {}

        geocoder.geocode(address.toString())
        .then(function(resT) {
            
            const latitude = resT[0].latitude;
            const longitude = resT[0].longitude;
            resultat["latitude"] = latitude;
            resultat["longitude"] = longitude;
            
         })
         .then(function(resT) {
            res.send(resultat);
         })
         .catch(function(err) {
             console.log(err);
        });

    } catch (err) {
        res.send(err);
    }
});

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
                result.push({ 'id': id,'name': name, 'description': description, 'tags': tags, 'address': address,'latitude': latitude, 'longitude': longitude, 'note': note, 'image': imageToString, 'product': product });
            };
        }
    }
    return result;
}

// get all bars
router.get(config.rootAPI + '/allbars', async (req, res) => {
    const barFound = await Bar.find({});
    const result = createresponse(barFound);
    res.send(result);
});

router.get(config.rootAPI + '/bar/:barname', async (req, res) => {
    const barName = req.params.barname;
    const barRegex = new RegExp("^" + barName, 'i');
    const barFound = await Bar.find({
        name: barRegex
    });
    const result = createresponse(barFound);
    res.send(result);
});

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

router.post(config.rootAPI + '/bar/create-bar', upload.single('upload-bar'), async (req, res) => {
    try {
        const {name, description, tags, address, note, products, phone } = req.body;
        if(!name || !description ||  !tags || !address || !note || !products || !phone ){
            throw '1.Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, téléphone,  addresse, produits et images';
        }
        const image = req.file.buffer;
        const imageCrop = await sharp(image).resize({ width: 820, height: 360 }).png().toBuffer();

        const resultat = {};

        geocoder.geocode(address.toString())
        .then(function(resT) {
            resultat["latitude"] = resT[0].latitude;
            resultat["longitude"] = resT[0].longitude;
         })
         .then(async function() {
             console.log('name' + name);
            const bar = new Bar({'name':name, description, tags, address, 'latitude': resultat.latitude,  'longitude' : resultat.longitude, phone, note, 'image': imageCrop, products });
            await bar.save();
            res.status(201).send("OK");
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

router.post(config.rootAPI + '/contact-us', (req, res) => {
    try {
        const {email, objet, message } = req.body;
        if(!email || !message || !objet) {
            throw 'Merci de compléter tous les champs (e-mail, password)';
        }
        contactEmail(email, objet, message)
        res.status(200).send("OK");
    } catch (err) {
        res.status(422).send({error: "Votre message n'a pas pu être transmis."})
    }
});

module.exports = router;
