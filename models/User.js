const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const FavoriteBarSchena = new mongoose.Schema({
    barID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Bar'
    }
}, {
    timestamps: true
});

mongoose.model('barNote', FavoriteBarSchena);

const userSchema = new mongoose.Schema({
    managerBarID: {
        type: String
    },
    isBarManager: {
        type: Boolean,
        required: true, 
        default: false
    },
    isAdmin: {
        type: Boolean,
        required: true, 
        default: false
    },
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
        required: true,
        minLength: 7,
        trim: true,
        validate(value) {
            if(value.toLowerCase().includes('password')) {
                throw new Error('Merci de ne pas utiliser "password" dans votre mot de passe!');
            }
        }
    },
    image: {
        type: Buffer
    },
    resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    },
    favorisBar: [FavoriteBarSchena],
    accessLevel: {
        type: Number,
        require: false,
        default: -1
    }
},{
    timestamps: true
});


//Suppression du mot de passe de la response.
userSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject()

    delete userObject.password

    return userObject
}

//Génération du token, en fonction de l'utilisateur.
userSchema.methods.generateAuthToken = async function () {
    const user = this
    const token = jwt.sign({ '_id': user._id.toString() }, process.env.JWT_SECRET);
    user.tokens = user.tokens.concat({ token })
    //user.token = token
    await user.save()

    return token
}

//Avant de sauvegarder on HASH + SALT le mot de passe.
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

// Compare le mot de passe soumit et celui en base de données.
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

// Generate unique LINK for reset password.
userSchema.methods.generatePasswordReset = function() {
    const user = this;
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000; //expires in an hour
};

const User = mongoose.model('User', userSchema);
module.exports = User;