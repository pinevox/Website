const GoCardlessService = require('../services/GocardlessService');
const { StatusCodes } = require('http-status-codes')
const {initializeMandate, mandateStatus} = require('../services/GocardlessService');


const initiateMandate = async (req, res) => {
    req.body.userEmail = req.user.userEmail;
    const authorisationUrl = await initializeMandate(req.body);
    res.status(StatusCodes.CREATED).json({ authorisationUrl });
}

module.exports = {initiateMandate};