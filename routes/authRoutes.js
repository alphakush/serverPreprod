
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
var path = require('path');
const config = require('../config');
const User = mongoose.model('User');
const router = express.Router();
const { welcomeEmail } = require('../emails/account');
const ArrayToString = require('./base64ArrayBuffer');


const fs = require('fs');

// Route pour CREER un compte sur l'application.
router.post(config.rootAPI+'/signup', async (req,res) => {
    try{
        // chaque utilisateur va avoir une image par défaut, qu'il pourra ensuite modifier.

        // NOTE : process.cwd() : Note the absolute path of where you started the Node.js process !
        const defaultImage = process.cwd()+'/images/avatar.png';
        const imageCropDefault = await sharp(defaultImage).resize(820, 360, { fit: sharp.fit.inside, withoutEnlargement: true }).toBuffer();
        
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

module.exports = router;