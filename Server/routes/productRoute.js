const express = require('express');
const router = express.Router();
const {getProducts, updateProductList, addProduct , deleteProduct, updateProduct} = require('../controller/productController');
const { updatePackages, getPackage } = require('../controller/packageController');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });


router.route('/').get(getProducts).post(addProduct).patch(updateProduct).delete(deleteProduct);
router.route('/update-product-list').post(upload.single('File'), updateProductList);
router.route('/update-packages').post( updatePackages);
router.route('/get-package').get(getPackage);

module.exports = router;