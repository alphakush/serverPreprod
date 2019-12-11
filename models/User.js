const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var validator = require('validator');
const jwt = require('jsonwebtoken');

const userFavoriteBarSchena = new mongoose.Schema({
    barid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bar'
    },
    comment: {
        type: String,
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw Error("L'e-mail est invalide");
            }
        }
    },
    password: {
        type: String,
        required: true
    },
    favoriteBars: [userFavoriteBarSchena]
});

userSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject()

    delete userObject.password

    return userObject
}


userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ '_id': user._id.toString() }, process.env.JWT_SECRET);
    user.tokens = user.tokens.concat({ token })
    //user.token = token
    await user.save()

    return token
}

//before save the password in DB  hash + salt
userSchema.pre('save', function (next) {
    const user = this;
    if (!user.isModified('password')) {
        return next();
    }
    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return next(err);
        }
        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) {
                return next(err);
            }
            user.password = hash;
            next();
        });
    });
});

// Compare the password
userSchema.methods.comparePassword = function (candidatePassword) {
    const user = this;
    return new Promise((resolve, reject) => {
        bcrypt.compare(candidatePassword, user.password, (err, isMatch) => {
            if (err) {
                return reject(err);
            }
            if (!isMatch) {
                return reject(false);
            }
            resolve(true);
        })
    });
};

mongoose.model('User', userSchema);