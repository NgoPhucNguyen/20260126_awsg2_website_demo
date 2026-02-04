import express from 'express';
import { register } from '../controller/authController.js';

const route = express.Router();

route.post('/', (req, res) => {
    console.log("Auth endpoint hit")
});

route.post('/register', register);

export default route;