const express = require("express");
const mongoose = require("mongoose");
const config = require("../config");
const sharp = require("sharp");
const multer = require("multer");
const checkingAuth = require("../middlewares/checkingAuth");
const ArrayToString = require("./base64ArrayBuffer");
const { contactEmail } = require("../emails/account");
const NodeGeocoder = require("node-geocoder");

const Bar = mongoose.model("Bar");
const User = mongoose.model("User");
const router = express.Router();

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

// Route pour OBTENIR TOUS les bars disponibles
//
//allbars?limit=10&skip=0,10,20.... = limit : parseInt(req.query.limit)
//allbars?sortBy=createdAt:desc

router.get(config.rootAPI + "/allbars", async (req, res) => {
  const sortUser = {};

  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(":");
    sortUser[parts[0]] = parts[1] === "desc" ? -1 : 1;
  }
  Bar.find({})
    .sort(sortUser)
    .exec()
    .then((result) => {
      res.json(result);
    })
    .catch((err) => res.send(err));
});

//Route pour obtenur un bar par nom. Example barname: wallace
router.get(config.rootAPI + "/bar/:barname", async (req, res) => {
  try {
    const barName = req.params.barname;
    const barRegex = new RegExp("^.*" + barName + ".*", "i");
    const barFound = await Bar.find({
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

// Route pour CREER UN BAR. Il faut renseigner : nom, description, tags, téléphone, tags, téléphone du bar, addresse, produits et images.
router.post(
  config.rootAPI + "/bar/create-bar",
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
          const bar = new Bar({
            name: name,
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
          await bar.save();
          res.status(201).send({ success: "OK" });
        })
        .catch(function (err) {
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

/*
 *LES ROUTES CI DESSOUS PERMETTENT LA GESTION DES FAVORIS
 *
 */

// Route pour AJOUTER un bar à ses favoris
router.post(
  config.rootAPI + "/bar/add-favorite",
  checkingAuth,
  async (req, res) => {
    try {
      const { barID } = req.body;
      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth).

      if (!barID || !userID) {
        throw "Informations manquantes pour ajouter ce bar à vos favoris !";
      }

      const user = await User.findById({ _id: userID });

      //On vérifie que le bar ne trouve pas dans les favoris de l'utilisateur.
      userCurrentFavorite = user.favorisBar;
      let isAlreadyInFavorite = userCurrentFavorite.some((bar) => {
        const currentBar = JSON.stringify(bar["barID"]);
        const currentBarID = JSON.stringify(barID);

        return currentBar === currentBarID;
      });

      if (isAlreadyInFavorite) {
        return res
          .status(422)
          .send({ error: "Ce bar se trouve dèjà dans vos favoirs." });
      }
      //ajout un bar dans les favoris de l'utilisateur.
      user.favorisBar.push({ barID });

      //On incrémente la variable : counterLike.
      const bar = await Bar.findById({ _id: barID });
      currentCounterLike = bar.counterLike + 1;

      Bar.findByIdAndUpdate(barID, { counterLike: currentCounterLike }).then(
        () => {
          user.save();
          res.status(201).send({ success: "OK" });
        }
      );
    } catch (err) {
      res.status(422).send({
        error: "Une erreur s'est produite pour ajouter ce bar à vos favoris",
      });
    }
  }
);

// Route pour LISTER ses bars favoris
router.get(
  config.rootAPI + "/my-favorite-bar",
  checkingAuth,
  async (req, res) => {
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
          path: "favorisBar.barID",
        })
        .exec(function (err, data) {
          if (err) return handleError(err);
          if (data) {
            const userObject = data.toObject();
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
      res
        .status(422)
        .send({ error: "Une erreur s'est produite pour lister vos favoris." });
    }
  }
);

// Route pour SUPPRIMER UN BAR un bar de ses favoris
router.delete(
  config.rootAPI + "/delete-favorite/:id",
  checkingAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

      if (!id || !userID) {
        return res.status(422).send({
          error:
            "Informations manquantes pour supprimer ce bar de vos favoirs.",
        });
      }

      User.findOne(
        { "favorisBar.barID": id },
        { "favorisBar.$": 1 },
        async (err, data) => {
          try {
            if (data) {
              const bar = await Bar.findById({ _id: id });

              const currentCounterLike = bar.counterLike - 1;

              const userDeleteID = data.favorisBar[0]._id;
              User.updateOne(
                { _id: userID },
                { $pull: { favorisBar: { _id: userDeleteID } } },
                { safe: true, multi: true },
                function (err, obj) {}
              );

              Bar.findByIdAndUpdate(id, {
                counterLike: currentCounterLike,
              }).then(() => {
                bar.save();
                res.status(201).send({ success: "OK" });
              });
            } else {
              return res
                .status(422)
                .send({ error: "Ce bar n'existe pas dans vos favoris." });
            }
          } catch (error) {
            res.status(422).send({
              error:
                "Une erreur s'est produite pour supprimer ce bar de vos favoris.",
            });
          }
        }
      );
    } catch (err) {
      res.status(422).send({
        error: "Une erreur s'est produite pour supprimer ce bar à vos favoris",
      });
    }
  }
);

/*
 *LES ROUTES CI DESSOUS PERMETTENT LA GESTION  D'UN COMMENTAIRE UN BAR
 *
 */
// Route pour AJOUTER commentaire à un bar
router.post(
  config.rootAPI + "/bar/add-comment",
  checkingAuth,
  async (req, res) => {
    try {
      const { comment, barID } = req.body;
      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

      if (!barID || !userID || !comment) {
        throw "Une erreur s'est produite pour ajouter votre commentaire.";
      }

      //retrouve le bar et ajoute un commentaire.
      const bar = await Bar.findById({ _id: barID });

      bar.commentaire.push({ comment, author: userID });

      // Ajoute +1 au compteur currentCounterComment
      currentCounterComment = bar.counterComment + 1;
      Bar.findByIdAndUpdate(barID, {
        counterComment: currentCounterComment,
      }).then(() => {
        bar.save();
        res.status(201).send({ success: "OK" });
      });
    } catch (err) {
      res.status(422).send({
        error: "Une erreur s'est produite pour ajouter votre commentaire.",
      });
    }
  }
);

// Route pour LISTER les commentaires d'un bar donné.
router.get(config.rootAPI + "/bar/all-comment/:barID", async (req, res) => {
  try {
    const barID = req.params.barID;

    if (!barID) {
      throw '"Informations manquantes, merci de vous authentifier !';
    }
    /*
        Explication: On trouve un bar par ID, ensuite on utilise populate à l'aide "ref "(cf Model User) pour afficher toutes les informations du l'utilisateur.
        *
        */

    Bar.findById({ _id: barID })
      .populate({
        path: "commentaire.author",
        select: "username image -_id", //-_id on soustrait les informations inutiles.
      })
      .exec(function (err, data) {
        if (err) throw handleError(err);
        if (data) {
          try {
            const userObject = data.toObject();
            const result = userObject.commentaire;

            const resultat = [];

            for (let i = 0; i < result.length; i++) {
              var object_tmp = {};

              let childArray_id = result[i]._id;
              let childArray_comment = result[i].comment;
              let childArray_author = result[i].author.username;
              let childArray_image = result[i].author.image;

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
    console.log(err);
    res.status(422).send({
      error: "Une erreur s'est produite pour lister les commentaires.",
    });
  }
});

// Route pour AJOUTER UNE NOTE à un bar
router.patch(
  config.rootAPI + "/bar/add-note",
  checkingAuth,
  async (req, res) => {
    try {
      const { barID, userNote } = req.body;
      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

      const updates = Object.keys(req.body);
      const allowedUpdates = ["userNote", "barID"];

      const isValidOperation = updates.every((update) =>
        allowedUpdates.includes(update)
      );

      if (!isValidOperation) {
        return res.status(400).send({ error: "Invalide update !" });
      }

      if (!barID || !userID || !userNote) {
        throw "Informations manquantes pour ajouter votre note.";
      }

      if (userNote < 0 || userNote > 5) {
        throw "Informations manquantes pour ajouter votre note.";
      }

      //Vérifie si on a déjà noter ce bar auparavant
      //et on prépare les rêquetes pour la sommation.
      const bar = await Bar.findOne({ _id: barID });

      const subdocument = bar.userAlreadyRate;

      var id2 = mongoose.Types.ObjectId(userID.toString());

      if (subdocument.some((e) => e.userID.equals(id2))) {
        res.status(200).send({ success: "Vous avez déjà noté ce bar." });
      } else {
        //ajoute l'utilisateur dans la liste des utilisateurs qui ont noté ce bar.
        subdocument.push({ userID: userID });
        bar.save();

        const addToSumNote = bar.sumNote + userNote;
        const addTocounterPerson = bar.counterPerson + 1;
        const average = roundHalf(addToSumNote / addTocounterPerson);

        Bar.findByIdAndUpdate(
          barID,
          {
            $set: {
              note: average,
              sumNote: addToSumNote,
              counterPerson: addTocounterPerson,
            },
          },
          function (err, result) {
            if (err) {
              throw "Une erreur est survenue pour ajouter une note à ce bar.";
            }
            res.status(201).send({ success: "OK" });
          }
        );
      }
    } catch (err) {
      res
        .status(422)
        .send({ error: "Une erreur s'est pour ajouter votre note." });
    }
  }
);

// Route pour VERIFIER si ce bar a été déjà noter par un utilisateur
router.get(
  config.rootAPI + "/bar/check-note/:barID",
  checkingAuth,
  async (req, res) => {
    try {
      const barID = req.params.barID;
      const userID = req.user._id; // id de l'utilisateur est retrouvé ici grâce au middleware (cad: checkingAuth)

      if (!barID || !userID) {
        throw "Informations manquantes pour ajouter votre note.";
      }

      //Vérifie si on a déjà noter ce bar auparavant.
      const bar = await Bar.findOne({ _id: barID });

      const subdocument = bar.userAlreadyRate;

      var id2 = mongoose.Types.ObjectId(userID.toString());

      if (subdocument.some((e) => e.userID.equals(id2))) {
        res.status(200).send({ success: "Vous avez déjà noté ce bar." });
      } else {
        res
          .status(200)
          .send({ success: "Vous n'avez pas encore noté ce bar." });
      }
    } catch (err) {
      res
        .status(422)
        .send({ error: "Une erreur s'est produite." });
    }
  }
);

module.exports = router;
