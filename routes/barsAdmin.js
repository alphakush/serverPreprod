const express = require("express");
const mongoose = require("mongoose");
const config = require("../config");
const sharp = require("sharp");
const multer = require("multer");
const checkingAuth = require("../middlewares/checkingAuth");
const ArrayToString = require("./base64ArrayBuffer");
const { contactEmail, nowYouAreAdministator, nowYouAreManager } = require("../emails/account");
const NodeGeocoder = require("node-geocoder");

const Bar = mongoose.model("Bar");
const User = mongoose.model("User");
const BarTMP = mongoose.model("BarTMP");

const router = express.Router();

const ACCESS_LEVEL_ADMIN = 1;
const ACCESS_LEVEL_MANAGER_BAR = 0;
const ACCESS_LEVEL_SIMPLE_USER = -1;

var options = {
  provider: "google",
  httpAdapter: "https",
  apiKey: process.env.GOOGLE_API_KEY,
  formatter: null,
};

function roundHalf(num) {
  return Math.round(num * 2) / 2;
}

var geocoder = NodeGeocoder(options);

// Route pour DEVENIR ADMINSTRATEUR DE BARAKA.
router.patch(
  config.rootAdmin + "/upgrade-to-admin",
  checkingAuth,
  async (req, res) => {
    try {
      const { email } = req.body;

      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth).

      var user = await User.findById({ _id: userID });

      var accessLevel = user.accessLevel;

      if (accessLevel != ACCESS_LEVEL_ADMIN) {
        return res.status(422).send({
            error:
              "Vous n'avez pas l'authorisation d'accéder à cette resource.",
          });
      }

      var userModifyAccessLevel = await User.findOne({ email });

      var myQuery = new Object();

      if (userModifyAccessLevel == null) {
        return res
          .status(422)
          .send({ error: "User inexistant modification impossible." });
      } else {
        myQuery.accessLevel = 1;
      }

      User.findByIdAndUpdate(userModifyAccessLevel._id, myQuery).then(() => {
        nowYouAreAdministator(userModifyAccessLevel.username,userModifyAccessLevel.email)
        res.status(201).send({ success: "OK" });
      });
    } catch (err) {
      res.status(422).send({
        error: "Une error s'est produite pour upgrader cette utilisateur.",
      });
    }
  },
  (error, req, res, next) => {
    res
      .status(422)
      .send({
        error: "Une erreur est survenue pour effectuer votre modification.",
      });
  }
);

// Route pour DEVENIR MANAGER UN BAR.
router.patch(
  config.rootAdmin + "/upgrade-to-manager",
  checkingAuth,
  async (req, res) => {
    try {
      const { email } = req.body;

      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth).

      var user = await User.findById({ _id: userID });

      var accessLevel = user.accessLevel;

      if (accessLevel != ACCESS_LEVEL_ADMIN) {
        throw "Vous n'avez pas l'authorisation d'accéder à cette resource.";
      }

      var userModifyAccessLevel = await User.findOne({ email });
      var myQuery = new Object();

      if (userModifyAccessLevel == null) {
        throw "User inexistant modification impossible.";
      } else {
        myQuery.accessLevel = 0;
      }

      User.findByIdAndUpdate(userModifyAccessLevel._id, myQuery).then(() => {
        nowYouAreManager(userModifyAccessLevel.username,userModifyAccessLevel.email)
        res.status(201).send({ success: "OK" });
      });
    } catch (err) {
      res.status(422).send({
        error: "Une erreur est survenue pour effectuer votre modification.",
      });
    }
  },
  (error, req, res, next) => {
    res
      .status(422)
      .send({
        error: "Une erreur est survenue pour effectuer votre modification.",
      });
  }
);

// Route pour DEVENIR MANAGER UN BAR.
router.patch(
  config.rootAdmin + "/downgrade-normal-user",
  checkingAuth,
  async (req, res) => {
    try {
      const { email } = req.body;

      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth).

      var user = await User.findById({ _id: userID });

      var accessLevel = user.accessLevel;

      if (accessLevel != ACCESS_LEVEL_ADMIN) {
        throw "Vous n'avez pas l'authorisation d'accéder à cette resource.";
      }

      var userModifyAccessLevel = await User.findOne({ email });
      var myQuery = new Object();

      if (userModifyAccessLevel == null) {
        throw "User inexistant modification impossible.";
      } else {
        myQuery.accessLevel = -1;
      }

      User.findByIdAndUpdate(userModifyAccessLevel._id, myQuery).then(() => {
        res.status(201).send({ success: "OK" });
      });
    } catch (err) {
      console.log(err);
      res.status(422).send({
        error: err,
      });
    }
  },
  (error, req, res, next) => {
    res
      .status(422)
      .send({
        error: "Une erreur est survenue pour effectuer votre modification.",
      });
  }
);

// Route pour VALIDER D'UN BAR passer de la table BARTMP vers la table principale BAR.
router.patch(
  config.rootAdmin + "/validation-bar",
  checkingAuth,
  async (req, res) => {
    try {
      const { barName } = req.body;

      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth).

      var user = await User.findById({ _id: userID });

      var accessLevel = user.accessLevel;

      if (accessLevel != ACCESS_LEVEL_ADMIN) {
        return res
          .status(422)
          .send({
            error:
              "Vous n'avez pas l'authorisation d'accéder à cette resource.",
          });
      }

      const barRegex = new RegExp("^.*" + barName + ".*", "i");

      let barToModify = await BarTMP.findOne({ name: barRegex });

      if (barToModify == null) {
        return res
          .status(422)
          .send({ error: "Bar inexistant modification impossible." });
      }
      // on récupère les données qui sont dans le table barTMP on affectue à un object BAR.
      const bar = new Bar({
        name : barToModify.name,
        description : barToModify.description,
        tags : barToModify.tags,
        address : barToModify.address,
        latitude: barToModify.latitude,
        longitude: barToModify.longitude,
        phone : barToModify.phone,
        note : barToModify.note,
        image : barToModify.image,
        products : barToModify.products,
      });

      //On sauvegarde dans bar les modifications
      await bar.save().then(() =>{
        //On supprime le bar dans la table barTMP
        BarTMP.deleteOne({ _id: barToModify._id }, function (err) {
          if (err) {
            return res.status(422).send({
            error:
              "Une erreur s'est produite pour mettre à jour un champ.",
          });
          }
        }).then(() =>{
          res.status(201).send({ success: "OK" });
        });
      });
    } catch (err) {
      console.log(err);
      res.status(422).send({
        error: err,
      });
    }
  },
  (error, req, res, next) => {
    res
      .status(422)
      .send({
        error: "Une erreur est survenue pour effectuer votre modification.",
      });
  }
);

// Route pour OBTENIR TOUS les bars disponibles
//
//allbars?limit=10&skip=0,10,20.... = limit : parseInt(req.query.limit)
//allbars?sortBy=createdAt:desc

router.get(config.rootAdmin + "/allbars", async (req, res) => {
  const sortUser = {};

  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(":");
    sortUser[parts[0]] = parts[1] === "desc" ? -1 : 1;
  }
  BarTMP.find({})
    .sort(sortUser)
    .exec()
    .then((result) => {
      res.json(result);
    })
    .catch((err) => res.send(err));
});

//Route pour obtenur un bar par nom. Example barname: wallace
router.get(config.rootAdmin + "/bar/:barname", async (req, res) => {
  try {
    const barName = req.params.barname;
    const barRegex = new RegExp("^.*" + barName + ".*", "i");
    const barFound = await BarTMP.find({
      name: barRegex,
    });
    res.send(barFound);
  } catch (e) {
    res
      .status(422)
      .send({ error: "Une erreur s'est produite pour trouver votre bar." });
  }
});

// Les conditions pour  uploader une image
const upload = multer({
  limits: {
    //Max of file 5Mo= 5000000 bytes.
    fileSize: 5000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
      return cb(
        new Error(
          "Votre image doit être moins 5 mo et de format png, jpg ou jpeg. Merci de bien vérifer ses informations"
        )
      );
    }
    cb(undefined, true);
  },
});

// Route pour CREER UN BAR.
router.post(
  config.rootAdmin + "/bar/create-bar",
  upload.single("upload-bar"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        tags,
        address,
        note,
        products,
        phone,
      } = req.body;

      if (
        !name ||
        !description ||
        !tags ||
        !address ||
        !note ||
        !products ||
        !phone
      ) {
        throw "Merci de remplir toutes les champs pour créer un bar à savoir :nom, description, tags, téléphone,  addresse, produits et images";
      }

      const userimage = req.file.buffer;
      const imageCrop = await sharp(userimage)
        .resize(820, 360, { fit: sharp.fit.inside, withoutEnlargement: true })
        .png()
        .toBuffer();

      const image = ArrayToString(imageCrop);

      //pour obtenir la longittude et latitude
      const resultat = {};

      geocoder
        .geocode(address.toString())
        .then(function (resT) {
          resultat["latitude"] = resT[0].latitude;
          resultat["longitude"] = resT[0].longitude;
        })
        .then(async function () {
          const bar = new BarTMP({
            name,
            description,
            tags,
            address,
            latitude: resultat.latitude,
            longitude: resultat.longitude,
            phone,
            note,
            image,
            products,
          });
          await bar.save().then( () => {
            res.status(201).send({ success: "OK" });
          });
        })
        .catch(function (err) {
          console.log(err);
          res.status(422).send({
            erreur: "Une erreur est survenu pour l'ajout de votre bar.",
          });
        });
    } catch (err) {
      res.status(422).send({
        error:
          "Merci de remplir  toutes les champs pour créer un bar à savoir :nom, description, tags, addresse, produits et images",
      });
    }
  },
  (error, req, res, next) => {
    res
      .status(422)
      .send({ error: "Une erreur est survenu pour l'ajout de votre bar." });
  }
);

// Route pour MODIFIER UN BAR.
router.patch(
  config.rootAdmin + "/bar/modify-bar",
  checkingAuth,
  upload.single("upload-bar"),
  async (req, res) => {
    try {
      const {
        barID,
        newName,
        newDescription,
        newTags,
        newAddress,
        newProducts,
        newPhone,
      } = req.body;

      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth).

      let user = await User.findById({ _id: userID });

      let accessLevel = user.accessLevel;

      if (accessLevel != ACCESS_LEVEL_ADMIN) {
        throw "Vous n'avez pas l'authorisation d'accéder à cette resource.";
      }

      let barToModify = await Bar.findById(barID);

      if (barToModify == null) {
        throw "Bar inexistant ou modification  impossible.";
      }

      var myQuery = new Object();

      //Construct an object for the query to modify the bar.

      if (!newName == "") {
        myQuery.name = newName;
      }
      if (!newDescription == "") {
        myQuery.description = newDescription;
      }
      if (!newTags == "") {
        myQuery.tags = newTags;
      }
      if (!newAddress == "") {
        myQuery.address = newAddress;

        //update longitude and latitude for the new adress.
        await geocoder.geocode(newAddress.toString()).then(function (resT) {
          myQuery.latitude = resT[0].latitude;
          myQuery.longitude = resT[0].longitude;
        });
      }
      if (!newProducts == "") {
        myQuery.products = newProducts;
      }
      if (!newPhone == "") {
        myQuery.phone = newPhone;
      }

      Bar.findByIdAndUpdate(barToModify._id, myQuery).then(() => {
        res.status(201).send({ success: "OK" });
      }).catch((err) => {
        var error = err.errmsg;
        if(error.includes("key error")){
          res.status(422).send({
            error: 'Une erreur est survenue lors de la modification de ce bar. Le nom du bar indiqué existe déjà'
          })
        } else {
          res.status(422).send({
            error: 'Une erreur est survenue lors de la modification de ce bar.'
          })
        }
        
      });
    } catch (err) {
      res.status(422).send({
        error: 'Une erreur est survenue lors de la modification de ce bar.'
      });
    }
  },
  (error, req, res, next) => {
    res
      .status(422)
      .send({
        error: "Une erreur est survenue lors de la modification de ce bar.",
      });
  }
);

//Route pour nous contacter
router.post(config.rootAPI + "/contact-us", (req, res) => {
  try {
    const { email, objet, message } = req.body;
    if (!email || !message || !objet) {
      return res.status(422).send({
        error:
          "Informations manquantes. Merci de bien renseigner un email, un message et un object.",
      });
    }
    contactEmail(email, objet, message);
    res.status(200).send({ success: "OK" });
  } catch (err) {
    res.status(422).send({ error: "Votre message n'a pas pu être transmis." });
  }
});

module.exports = router;
