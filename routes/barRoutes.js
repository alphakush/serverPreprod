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

// Route pour OBTENIR TOUS les bars disponibles

//
//allbars?limit=10&skip=0,10,20.... = limit : parseInt(req.query.limit)
//allbars?sortBy=createdAt:desc

router.get(config.rootAPI + '/allbars', async (req, res) => {
    const sortUser = {};

    if(req.query.sortBy){
      const parts = req.query.sortBy.split(':');
      sortUser[parts[0]] =  parts[1] === 'desc' ? -1 : 1;
    }
    Bar.find({})
    .sort(sortUser)
    .exec()
    .then( (result) => {
        res.json(result);
    })
    .catch(err => res.send(err));
});

//Route pour obtenur un bar par nom. Example barname: wallace
router.get(config.rootAPI + '/bar/:barname', async (req, res) => {
    const barName = req.params.barname;
    const barRegex = new RegExp("^.*" + barName + '.*', 'i');
    const barFound = await Bar.find({
        name: barRegex
    });
    res.send(barFound);
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

// Route pour CREER UN BAR. Il faut renseigner : nom, description, tags, téléphone, tags, téléphone du bar, addresse, produits et images.
router.post(config.rootAPI + '/bar/create-bar', upload.single('upload-bar'), async (req, res) => {
    try {
        const { name, description, tags, address, note, products, phone } = req.body;

        if (!name || !description || !tags || !address || !note || !products || !phone) {
            throw 'Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, téléphone,  addresse, produits et images';
        }

        const userimage = req.file.buffer;
        const imageCrop = await sharp(userimage).resize(820, 360, { fit: sharp.fit.inside, withoutEnlargement: true }).png().toBuffer();

        const image = ArrayToString(imageCrop);

        //pour obtenir la longittude et latitude
        const resultat = {};

        geocoder.geocode(address.toString())
            .then(function (resT) {
                resultat["latitude"] = resT[0].latitude;
                resultat["longitude"] = resT[0].longitude;
            })
            .then(async function () {
                const bar = new Bar({ 'name': name, description, tags, address, 'latitude': resultat.latitude, 'longitude': resultat.longitude, phone, note, image, products });
                await bar.save();
                res.status(201).send({ success: "OK" });
            })
            .catch(function (err) {
                res.status(422).send(err)
            });

    } catch (err) {
        res.status(422).send({ error: 'Merci de remplir  toutes les champs pour créer un bar à savoir :nom, description, tags, addresse, produits et images' })
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
        const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth).

        if (!barID || !userID) {
            throw 'Informations manquantes pour ajouter ce bar à vos favoris !';
        }

        const user = await User.findById({ _id: userID });

        //On vérifie que le bar ne trouve pas dans les favoris de l'utilisateur.
        userCurrentFavorite = user.favorisBar;
        let isAlreadyInFavorite = userCurrentFavorite.some( (bar) => {
          const currentBar = JSON.stringify(bar['barID']);
          const currentBarID = JSON.stringify(barID);

          return currentBar === currentBarID;
        });

        if(isAlreadyInFavorite){
          return res.status(422).send({ error: "Ce bar se trouve dèjà dans vos favoirs." });
        }
        //ajout un bar dans les favoris de l'utilisateur.
        user.favorisBar.push({ barID });

        //On incrémente la variable : counterLike.
        const bar = await Bar.findById({ _id: barID });
        currentCounterLike = bar.counterLike + 1;

        Bar.findByIdAndUpdate(barID, { counterLike: currentCounterLike }).then(() => {
          user.save();
          res.status(201).send({ success: "OK" });
        });

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

// Route pour SUPPRIMER UN BAR un bar de ses favoris
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
            console.log("ici eroor");
            throw "Informations manquantes pour ajouter votre commentaire! Merci d'écrire un commentaire";
        }

        //add the new  commentaire.
        const bar = await Bar.findById({ _id: barID });
        bar.commentaire.push({ comment, 'author':userID });

        // add +1 to currentCounterComment
        currentCounterComment = bar.counterComment + 1;
        Bar.findByIdAndUpdate(barID, { counterComment: currentCounterComment }).then( () => {
          bar.save();
          res.status(201).send({ success: "OK" });
        });

    } catch (err) {
        //res.status(422).send({ error: "Une erreur s'est produite pour ajouter votre commentaire, Merci d'écrire un commentaire" });
        res.status(422).send(err)
    }
});

// Route pour LISTER les commentaires d'un bar donné.
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
                  try {
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

                  } catch (err) {
                    throw "Une erreur s'est produite.";
                  }
                }
            });

    } catch (err) {
        res.status(422).send({ error: "Une erreur s'est produite pour lister les commentaires." });
    }
});


// Route pour AJOUTER UNE NOTE à un bar
router.patch(config.rootAPI + '/bar/add-note', checkingAuth, async (req, res) => {
    try {
        const { barID, userNote } = req.body;
        const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

        if (!barID || !userID || !userNote) {
            throw "Informations manquantes pour ajouter votre note.";
        }

        if(userNote < 0 || userNote > 5) {
          throw "Informations manquantes pour ajouter votre note.";
        }

        Bar.findByIdAndUpdate(barID,{$set: {note: userNote }}, function(err, result){
        if(err){
            throw 'Une erreur est survenue pour ajouter une note à ce bar.';
        }
        res.status(201).send({ success: "OK" });
    });
    } catch (err) {
        res.status(422).send({ error: "Une erreur s'est pour ajouter votre note." });
    }
});

// Route pour COMPTER les commentaires d'un bar.


router.patch(config.rootAPI + '/updateCounterComment/:bar', checkingAuth, async (req, res) => {
    try {
      Bar.aggregate([
    { $match: { /* Query can go here, if you want to filter results. */ } },
    { $project: { commentaire: 1 } } /* select the tokens field as something we want to "send" to the next command in the chain */,
    { $unwind: '$commentaire' } /* this converts arrays into unique documents for counting */
  , { $group: { /* execute 'grouping' */
          _id: { commentaire: '$commentaire' } /* using the 'token' value as the _id */
        , count: { $sum: 1 } /* create a sum value */
      }
    }
  ], function(err, topTopics) {
      countTopics = topTopics.length;
      res.status(200).json(countTopics);
    });

      /*
      const myvalue = await Bar.countDocuments({  }, function (err, count) {
        console.log('there are %d jungle adventures', count);
        res.status(200).json(count);
      });
      */

    } catch (err) {
        res.status(422).send({ error: "Une erreur s'est pour retourner le nombre de commentaires" });
    }
});


module.exports = router;
