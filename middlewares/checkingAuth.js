const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');

module.exports  = (req, res, next) => {
    const {authorization } = req.headers;

    if(!authorization){
        return res.status(401).send({ error: 'Merci de vous connecter.'});
    }
    const token = authorization.replace("Beer ", "");
    jwt.verify(token, 'BARAKA_SECRET',async (err, payload) => {
        if(err ){
            return res.status(401).send({error: 'Merci de vous connecter'});
        }
        const {userId } = payload;

        const user = await User.findById(userId);
        req.user = user;
        next();
    });
};