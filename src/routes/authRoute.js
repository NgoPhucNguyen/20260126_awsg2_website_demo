import express from 'express';
import { login, register } from '../controller/authController.js';

const route = express.Router();

route.post('/', login);
route.post('/register', register);

export default route;