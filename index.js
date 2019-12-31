require('./models/User');
require('./models/Bars');
require('./models/Managers');

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

mongoose.set('useFindAndModify', false);

const authRoutes = require('./routes/authRoutes');
const barRoutes = require('./routes/barRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./Documentation/swagger');

const port = process.env.PORT || 1337;

const app = express();
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    next();
});

app.use(bodyParser.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(authRoutes);
app.use(barRoutes);

mongoose.connect(process.env.MONGODB_URL,{
    useUnifiedTopology: true,
   useNewUrlParser: true,
   useCreateIndex: true
});

mongoose.connection.on("connected", () => {
    console.log("Connected");
});

mongoose.connection.on("error", (err) => {
    console.log("Error connectiong to mongo", err);
});

app.get('/',(req,res) => {
    res.sendFile(__dirname +'/Documentation/welcome.html');
    });

app.listen(port, () => {
    console.log('Listening on port' + port);
});
