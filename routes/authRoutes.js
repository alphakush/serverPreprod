
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const config = require('../config');
const User = mongoose.model('User');
const router = express.Router();
const { welcomeEmail, restPassword, confirmRestPassword } = require('../emails/account');
const ArrayToString = require('./base64ArrayBuffer');
const path = require('path');


// Route pour CREER un compte sur l'application.
router.post(config.rootAPI+'/signup', async (req,res) => {
    try{
        // chaque utilisateur va avoir une image par défaut, qu'il pourra ensuite modifier.

        // NOTE : process.cwd() : Note the absolute path of where you started the Node.js process !
        const defaultImage = process.cwd()+'/images/avatar.png';
        const imageCropDefault = await sharp(defaultImage).resize(820, 360, { fit: sharp.fit.inside, withoutEnlargement: true }).png().toBuffer();

        const {username , email, password } = req.body;
        const user = new User({username, email, password, 'image': imageCropDefault});
        
        await user.save();
        welcomeEmail(user.email, user.username);
        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET);
        res.send({user, token});
    } catch (err) {
        res.status(422).send({error : "Cette adresse e-mail est dèja associée à un compte."});
    }
});

// Route pour SE CONNECTER à l'application.
router.post(config.rootAPI+'/signin', async (req,res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(422).send({ error: "Le mot de passe ou l'e-mail est invalide" });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(422).send({ error: "Le mot de passe ou l'e-mail est invalide." });
    }

    try {
        await user.comparePassword(password);
        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET);
        res.send({user,token});
    } catch (err) {
        return res.status(422).send({error: "Le mot de passe ou l'e-mail est invalide"});
    }
});

// Etape 1 : RE INITILIASER son mot de passe. Envoie formulaire avec SENDGRID.

//current year est utilisé pour les 3 prochaines routes, il permet d'avoir l'annéé en cours.
currentYear = new Date().getFullYear();

router.post(config.rootAPI+'/rest-password', async (req,res) => {
    const { email } = req.body;
    if (!email ) {
        return res.status(422).send({ error: "Merci d'inquer une adresse email." });
    }
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(422).send({ error: "Aucune adresse e-mail est associé à cette e-mail." });
    }
    try {
        const username =user.username;
        const userEmail = user.email;
        const apiVersion = config.rootAPI;
        
        //generate tmpLink  for the user
        user.generatePasswordReset();

        const tmpLink = user.resetPasswordToken;
        user.save();

        //send e-mail to user 
        restPassword(username, userEmail, tmpLink, currentYear, apiVersion);
        res.status(200).send({ success: "OK" });
    } catch (err) {
        return res.status(422).send({error: "Une erreur s'est produite pour re intiliser votre mot de passe."});
    }
});

// Etape 2 : RE INITILIASER son mot de passe : envoie de la page 
router.get(config.rootAPI+'/restpassword/:token', async (req,res) => {
    const token = req.params.token;
    User.findOne({resetPasswordToken : token, resetPasswordExpires : {$gt : Date.now()}})
    .then(user => {
        res.render('resetpassword', {
            title: 'Réinitilisation de votre mot de passe',
            token: token,
            userId: user._id.toString(),
            currentYear: currentYear
        });
    })
    .catch(error =>{
        res.render('404',{
            title: '404...',
            message: "404 ME VOICI",
            currentYear: currentYear 
        })
    })
});

// Etape 3 : RE INITILIASER son mot de passe : Mettre à jour le mot de passe dans la base de donnée.
router.post(config.rootAPI+'/check-form/:token', async (req,res) => {
    const newPassword1 = req.body.password1;
    const newPassword2 = req.body.password2;
    const userId = req.body.userId;
    const token = req.body.token;

    let resetUser;

    User.findOne({resetPasswordToken : token, resetPasswordExpires : {$gt : Date.now()}, _id : userId })
    .then(user => {
        
        resetUser = user;
        // Change le mot de passe et set resetPasswordToken et resetPasswordExpires à UNDEFINED.
        resetUser.password = newPassword1;
        resetUser.resetPasswordToken = undefined;
        resetUser.resetPasswordExpires = undefined;
        return resetUser.save();
    }).then(result => {
        confirmRestPassword(resetUser.username, resetUser.email,currentYear );
        res.render('congratulation', {
            title : 'Congratulation',
            currentYear: currentYear,
            name: resetUser.username,
            subtitle: 'Félicitation'
        });
    })
    .catch(error => {
        res.render('404', {
            title: '404 me voici ! ',
            currentYear: currentYear
        })
    }) 
});

module.exports = router;
