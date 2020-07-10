const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');

module.exports  = (req, res, next) => {
    const {authorization } = req.headers;

    if(!authorization){
        return res.status(401).send({ error: 'Merci de vous connecter.'});
    }
    const token = authorization.replace("Bearer ", "");
    jwt.verify(token, 'BARAKA_SECRET',async (err, payload) => {
        if(err ){
            return res.status(401).send({error: 'Merci de vous connecter'});
        }
        const {userId } = payload;

        //Une fois connecté on trouve l'user par ID dans la base de donnée.
        const user = await User.findOne({_id: userId});

        if(user == null){
            return res.status(401).send({error: 'Merci de vous connecter'});
        }
        
        req.user = user;
        next();
    });
};