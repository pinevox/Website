const express = require('express');
const router = express.Router();
const {login , register, refreshToken, googleAuth, forgotPassword, resetPassword} = require('../controller/authController');
const authentication = require('../middleware/authentication');

router.route('/login').post(login);
router.route('/register').post(register);
router.route('/google-auth').post(googleAuth);
router.route('/refresh-token').post(authentication, refreshToken);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').post(resetPassword);


module.exports = router;