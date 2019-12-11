const express = require('express');
const mongoose = require('mongoose');
const config = require('../config');
const sharp = require('sharp')
const multer = require('multer');
const checkingAuth = require("../middlewares/checkingAuth");
const ArrayToString = require ('./base64ArrayBuffer');
const { contactEmail } = require('../emails/account');

const Bar = mongoose.model('Bar');
const router = express.Router();

//Acces to the screen, only for connected users
//router.use(checkingAuth);

// methods format
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
                var imageToString = ArrayToString(image);
                result.push({ 'id': id,'name': name, 'description': description, 'tags': tags, 'address': address, 'note': note, 'image': imageToString, 'product': product });
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
        const {name, description, tags, address, note, products } = req.body;
        if(!name || !description ||  !tags || !address || !note || products ){
            throw 'Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, addresse, produits et images';
        }
        const image = req.file.buffer;
        const imageCrop = await sharp(image).resize({ width: 250, height: 250 }).png().toBuffer();
        const bar = new Bar({'name':name, description, tags, address, note, 'image': imageCrop, products });
        await bar.save();
        res.status(201).send(bar);
    } catch (err) {
        res.status(422).send({error: 'Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, addresse, produits et images' })
    }
}, (error, req, res, next) => {
    res.status(422).send({ error: error.message })
});

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