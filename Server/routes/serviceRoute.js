const express = require('express');
const router = express.Router();
const {saveService, findService} = require('../controller/serviceController');

router.route('/').post(saveService).get(findService);

module.exports = router;