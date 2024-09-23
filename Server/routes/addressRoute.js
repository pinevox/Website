const express = require("express");
const router = express.Router();
const { saveAddress, findAddress } = require("../controller/addressController");

router.route("/").post(saveAddress).get(findAddress);

module.exports = router;
