const express = require('express');
const router = express.Router();
const {getUserDetails} = require('../controller/userController');

router.route('/').get(getUserDetails);

module.exports = router;