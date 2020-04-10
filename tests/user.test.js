const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config');
const app = require("../app");
const User = require('../models/User');

const userOneId = new mongoose.Types.ObjectId;

let testMe;

const userBaraka = {
    _id: userOneId,
    username: 'baraka-test',
    email: 'baraka-test@example.com',
    password: 'barka!test'
}

//run the fonction before each test.
beforeEach(async () => {
  await User.deleteMany(); //On supprime tous les users de la base de donnée, afin que le test de création d'un nouvelle utilisateur est OK.
  await new User(userBaraka).save();
})

test("Sign up new user" ,async() =>{
  await request(app).post(config.rootAPI+'/signup').send({
    username: 'jest',
    email: 'jest-123@gmail.com',
    password: 'test'
  }).expect(200)
})

test('Should login existing user', async () => {
  
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

})

test('Should not login nonexistent user', async () => {
    await request(app).post(config.rootAPI+'/signin')
    //.set('Authorization', 'Bear``${}')
    .send({
        email: userBaraka.email,
        password: 'thisisnotmypass'
    })
    .expect(422)
})
