const request = require('supertest');
const config = require('../config');
const app = require("../app");
const User = require('../models/User');

const userBaraka = {
    username: 'baraka-test',
    email: 'baraka-test@example.com',
    password: 'barka!test'
}

beforeEach(async () => {
  await User.deleteMany(); //On supprime tous les users de la base de donnée, afin que le test de création d'un nouvelle utilisateur est OK.
  await new User(userBaraka).save();
})

test("Sign up new user" ,async() =>{
  await request(app).post(config.rootAPI+'/signup').send({
    username: 'jest',
    email: 'jest-test@gmail.com',
    password: 'test'
  }).expect(200)
})

test('Should login existing user', async () => {
    await request(app).post(config.rootAPI+'/signin').send({
        email: userBaraka.email,
        password: userBaraka.password
    }).expect(200)
})

test('Should not login nonexistent user', async () => {
    await request(app).post(config.rootAPI+'/signin').send({
        email: userBaraka.email,
        password: 'thisisnotmypass'
    }).expect(422)
})
