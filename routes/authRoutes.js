
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = mongoose.model('User');
const router = express.Router();
const { welcomeEmail, contactEmail } = require('../emails/account');

router.post(config.rootAPI+'/signup', async (req,res) => {
    try{
        const {username , email, password } = req.body;
        const user = new User({username, email, password});
        await user.save();
        welcomeEmail(user.email, user.username);
        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET);
        res.send({user, token});
    } catch (err) {
        return  res.status(422).send({error : "Cette adresse e-mail est dèja associée à un compte."});
    }
});

router.post(config.rootAPI+'/signin', async (req,res) => {
    const { email, password } = req.body;
    console.log("email : " + email + " password: " + password );
    if (!email || !password) {
        return res.status(422).send({ error: "1. Le mot de passe ou l'e-mail est invalide" });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(422).send({ error: "2. Le mot de passe ou l'e-mail est invalide." });
    }

    try {
        await user.comparePassword(password);
        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET);
        res.send({user,token});
    } catch (err) {
        return res.status(422).send({error: "3. Le mot de passe ou l'e-mail est invalide"});
    }
});

module.exports = router;