const Packages = require('../models/Package');
const { StatusCodes } = require('http-status-codes');
const { BAD_REQUEST } = require('../errors');


const updatePackages = async (req,res) => {
    try {
        const { packages } = req.body;

        const updatePromises = packages.map(pkg => 
            Packages.findOneAndUpdate(
                { packageName: pkg.packageName },
                { cost: pkg.cost },
                { upsert: true, new: true, runValidators: true }
            )
        );

        await Promise.all(updatePromises); //makes sure all promises are resolved before moving on

        res.status(StatusCodes.CREATED).json({msg: 'Packages updated successfully.'});
    } catch (error) {
        res.status(StatusCodes.BAD_REQUEST).json({msg: `Error updating packages: ${error}`});    }
}

const getPackage = async (req, res) => {
    try {
        const { packageName } = req.query;
        const package = await Packages.findOne({packageName});
        res.status(StatusCodes.OK).json(package);
    } catch (error) {
        res.status(StatusCodes.BAD_REQUEST).json({msg: `Error fetching package: ${error}`});
    }
}

module.exports = {updatePackages , getPackage};