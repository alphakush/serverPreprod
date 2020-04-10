const request = require('supertest');
const config = require('../config');
const app = require("../app");
const Bars = require('../models/Bars');
const User = require('../models/User');
const path = require('path');
const fs = require('mz/fs');

let myToken;

// default user, create in user.
const userBaraka = {
  username: 'baraka-test',
  email: 'baraka-test@example.com',
  password: 'barka!test'
}

// the default bar 
const WallaceBar = {
  name: 'Wallace test',
  description: 'Le meilleur bar pour prendre une bière à Lyon',
  tags: '[Cool,sympa, magnifique]',
  address: '2 Rue Octavio Mey, 69005 Lyon',
  products: '[Kronenbourg, Mont Blanc Verte, Carlsberg Elephant]',
  note: '4.0',
  phone: '04 78 42 59 56',
}


//run the fonction before each test.
beforeAll(async () => {
  await User.deleteMany(); //On supprime tous les users de la base de donnée, afin que le test de création d'un nouvelle utilisateur est OK.
  
  await new User(userBaraka).save();
})

test('Connecting to user Baraka (default user)', async () => {
  const response = await request(app).post(config.rootAPI+'/signin').send({
      email: userBaraka.email,
      password: userBaraka.password
  }).expect(200)
  
  //check if the reponse is not NULL
  const user = await User.findById( (response.body.user._id).toString());
  expect(user).not.toBeNull();

  // check if the body of reponse is coressponding to the response
  expect(response.body).toMatchObject({
    user: {
        username: userBaraka.username,
        email: userBaraka.email
    }
})

// check if the password is not clear in the data base.
expect(user.password).not.toBe(userBaraka.password)

// get the token for Authorization
myToken = (response.body.token).toString();
})

test("Create a bar" ,async() =>{
  const toWallaceImage = path.join(__dirname+'/fixtures/wallacebarlogo.png');
  
  fs.exists(toWallaceImage)
      .then((exists) => {
        if (!exists) throw new Error('file does not exist');
      })
      .catch(error => {

      })
  await request(app)
  .post(config.rootAPI+'/bar/create-bar')
  .field('name', WallaceBar.name)
  .field('description', WallaceBar.description)
  .field('tags',WallaceBar.tags)
  .field('address',WallaceBar.address)
  .field('note',WallaceBar.note)
  .field('products', WallaceBar.products)
  .field('phone',WallaceBar.phone)
  .attach('upload-bar', toWallaceImage,'image.png')
  .then(res => {
    console.log(res.text);
  });
})

test("Get all bar " ,async() =>{
  const reponse = await request(app).get(config.rootAPI+'/allbars').send({
  }).expect(200)
})

