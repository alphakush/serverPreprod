//Export model

require('./models/User');
require('./models/Bars');
require('./models/Managers');
require('./models/BarsTMP');

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');

mongoose.set('useFindAndModify', false);

// create const for routes.
const authRoutes = require('./routes/authRoutes');
const barRoutes = require('./routes/barRoutes');
const barAdmin = require('./routes/barsAdmin');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./documentation/swagger');
const app = express();
app.set('view engine', 'hbs');


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,Content-Type');
    res.header("application/x-www-form-urlencoded");
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('views', path.join(__dirname,'/documentation/views'));  

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const publicDirectoryPath = path.join(__dirname+'../documentation/views');
app.use(express.static(publicDirectoryPath));

//use route
app.use(authRoutes);
app.use(barRoutes);
app.use(barAdmin);

mongoose.connect(process.env.MONGODB_URL,{
    useUnifiedTopology: true,
   useNewUrlParser: true,
   useCreateIndex: true
});

mongoose.connection.on("connected", () => {
    
});

mongoose.connection.on("error", (err) => {
    console.log("Error connectiong to mongo", err);
});

app.get('/',(req,res) => {
    res.render('index', {
        environnement: "BARAKA API Pré Production",
        numberVersion: "2",
        currentYear: new Date().getFullYear() 

    });
});

app.get('*', function(req, res) {
    res.redirect('/');
});

module.exports = app;
