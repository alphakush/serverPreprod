const request = require('supertest');
const config = require('../config');
const app = require("../app");
const User = require('../models/User');

const userBaraka = {
    username: 'baraka-test',
    email: 'baraka-test@example.com',
    password: 'barka!test'
}
// TODO: FAIRE POUR LES BARS !
test("bar test" ,async() =>{
  await request(app).post(config.rootAPI+'/signup').send({
    username: 'jest',
    email: 'jest-test@gmail.com',
    password: 'test'
  }).expect(200)
})
