const express = require('express');
const mongoose = require('mongoose');
const config = require('../config');
const sharp = require('sharp');
const multer = require('multer');
const checkingAuth = require("../middlewares/checkingAuth");
const ArrayToString = require('./base64ArrayBuffer');
const { contactEmail } = require('../emails/account');
var NodeGeocoder = require('node-geocoder');

const Bar = mongoose.model('Bar');
const User = mongoose.model('User');
const router = express.Router();

var options = {
    provider: 'google',
    httpAdapter: 'https',
    apiKey: process.env.GOOGLE_API_KEY,
    formatter: null
};

var geocoder = NodeGeocoder(options);

// Formater notre réponse avant envoi  pour les routes suivantes : allBars, trouver un bar avec un ID
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
                result.push({ '_id': id, 'name': name, 'description': description, 'tags': tags, 'address': address, 'latitude': latitude, 'longitude': longitude, 'note': note, 'image': imageToString, 'product': product });
            };
        }
    }
    return result;
}

// Route pour obtenir tous les bars disponibles
router.get(config.rootAPI + '/allbars', async (req, res) => {
    const barFound = await Bar.find({});
    const result = createresponse(barFound);
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
        cb(undefined, true);
    }
});

// Route pour créer un bar. Il faut renseigner : nom, description, tags, téléphone, tags, téléphone du bar, addresse, produits et images.
router.post(config.rootAPI + '/bar/create-bar', upload.single('upload-bar'), async (req, res) => {
    try {
        const { name, description, tags, address, note, products, phone } = req.body;

        if (!name || !description || !tags || !address || !note || !products || !phone) {
            throw 'Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, téléphone,  addresse, produits et images';
        }

        const image = req.file.buffer;
        const imageCrop = await sharp(image).resize(820, 360, { fit: sharp.fit.inside, withoutEnlargement: true }).png().toBuffer();

        //pour obtenir la longittude et latitude
        const resultat = {};

        geocoder.geocode(address.toString())
            .then(function (resT) {
                resultat["latitude"] = resT[0].latitude;
                resultat["longitude"] = resT[0].longitude;
            })
            .then(async function () {
                const bar = new Bar({ 'name': name, description, tags, address, 'latitude': resultat.latitude, 'longitude': resultat.longitude, phone, note, 'image': imageCrop, products });
                await bar.save();
                res.status(201).send({ success: "OK" });
            })
            .catch(function (err) {
                res.status(422).send(err)
            });

    } catch (err) {
        res.status(422).send({ error: 'Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, addresse, produits et images' })
    }
}, (error, req, res, next) => {
    res.status(422).send({ error: error.message })
});

//Route pour nous contacter
router.post(config.rootAPI + '/contact-us', (req, res) => {
    try {
        const { email, message } = req.body;
        if (!email || !message) {
            throw 'Merci de compléter tous les champs (e-mail, password)';
        }
        contactEmail(email, message)
        res.status(200).send({ success: "OK" });
    } catch (err) {
        res.status(422).send({ error: "Votre message n'a pas pu être transmis." })
    }
});

/*
 *LES ROUTES CI DESSOUS PERMETTENT LA GESTION DES FAVORIS 
 * 
 */

// Route pour AJOUTER un bar à ses favoris
router.post(config.rootAPI + '/bar/add-favorite', checkingAuth, async (req, res) => {
    try {
        const { barID } = req.body;
        const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

        if (!barID || !userID) {
            throw 'Informations manquantes pour ajouter ce bar à vos favoris !';
        }

        const user = await User.findById({ _id: userID });
        user.favorisBar.push({ barID });
        user.save();

        res.status(201).send({ success: "OK" });

    } catch (err) {
        res.status(422).send({ error: "Une erreur s'est produite pour ajouter ce bar à vos favoris" });
    }
});

// Route pour LISTER ses bars favoris
router.get(config.rootAPI + '/my-favorite-bar', checkingAuth, async (req, res) => {
    try {
        const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

        if (!userID) {
            throw '"Informations manquantes, merci de vous authentifier !';
        }
        /*
        Explication: On trouve un user par ID, ensuite on utilise populate à l'aide "ref "(cf Model Bar) pour afficher toutes les informations du bar
        */
        User.findById({ _id: userID })
            .populate({
                path: 'favorisBar.barID',
            })
            .exec(function (err, data) {
                if (err) return handleError(err);
                if (data) {
                    const userObject = data.toObject()
                    const result = userObject.favorisBar;

                    const resultat = [];
                    for (let i = 0; i < result.length; i++) {
                        let childArray = result[i].barID;
                        resultat.push(childArray);
                    }
                    res.status(200).json(resultat);
                }
            });
    } catch (err) {
        res.status(422).send({ error: "Une erreur s'est produite pour ajouter ce bar à vos favoris" });
    }
});

// Route pour supprimer un bar de ses favoris
router.delete(config.rootAPI + '/delete-favorite/:id', checkingAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

        if (!id || !userID) {
            throw "Informations manquantes pour supprimer ce bar à vos favoris !";
        }
        
        User.findOne({'favorisBar.barID': id}, {'favorisBar.$': 1}, async (err, data) =>{
            try {
                const userDeleteID = data.favorisBar[0]._id;
                User.updateOne({ _id: userID }, { "$pull": { "favorisBar": { "_id": userDeleteID } }}, { safe: true, multi:true }, function(err, obj) {
                });

                res.status(200).send(userDeleteID);
        } catch (error) {
                res.status(422).send({ error: "Une erreur s'est produite !" });
            }
        });

    } catch (err) {
        res.status(422).send({ error: "Une erreur s'est produite pour supprimer ce bar à vos favoris" });
    }
});

/*
 *LES ROUTES CI DESSOUS PERMETTENT LA GESTION  D'UN COMMENTAIRE UN BAR 
 * 
 */

// Route pour AJOUTER commentaire à un bar
router.post(config.rootAPI + '/bar/add-comment', checkingAuth, async (req, res) => {
    try {
        const { barID, comment } = req.body;
        const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

        if (!barID || !userID || !comment) {
            throw "Informations manquantes pour ajouter votre commentaire! Merci d'écrire un commentaire";
        } 
        const bar = await Bar.findById({ _id: barID });
        bar.commentaire.push({ comment, 'author':userID });
        bar.save();
        res.status(201).send({ success: "OK" });
        
    } catch (err) {
        res.status(422).send({ error: "Une erreur s'est produite pour ajouter votre commentaire, Merci d'écrire un commentaire" });
    }
});

// Route pour LISTER les commentaires dun bar donné.
router.get(config.rootAPI + '/bar/all-comment/:barID', checkingAuth, async (req, res) => {
    try {
        const barID = req.params.barID;
        const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth).
        
        if (!userID || !barID) {
            throw '"Informations manquantes, merci de vous authentifier !';
        }

        /*
        Explication: On trouve un bar par ID, ensuite on utilise populate à l'aide "ref "(cf Model User) pour afficher toutes les informations du l'utilisateur.
        *
        */

        Bar.findById({ _id: barID })
            .populate({
                path: 'commentaire.author',
                select: 'username image -_id' //-_id on soustrait les informations inutiles.
            })
            .exec(function (err, data) {
                if (err) throw handleError(err);
                if (data) {
                    const userObject = data.toObject()
                    const result = userObject.commentaire;

                    const resultat = [];

                    for (let i = 0; i < result.length; i++) {
                        var object_tmp = {};
                        
                        let childArray_id = result[i]._id;
                        let childArray_comment = result[i].comment;
                        let childArray_author = result[i].author.username;
                        let = childArray_image = result[i].author.image;        

                        //Build object with : _id, comment, author and image.
                        object_tmp["_id"] = childArray_id;
                        object_tmp["comment"] = childArray_comment;
                        object_tmp["author"] = childArray_author;
                        object_tmp["image"] = childArray_image;

                        resultat.push(object_tmp);
                    }
                    res.status(200).json(resultat);
                }
            }); 

    } catch (err) {
        res.status(422).send({ error: "Une erreur s'est produite pour lister les commentaires" });
    }
});

module.exports = router;