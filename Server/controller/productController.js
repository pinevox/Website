const axios = require("axios");
require("dotenv").config();
const { StatusCodes } = require("http-status-codes");
const XLSX = require("xlsx");
const { BadRequestError, NotFoundError } = require("../errors");
const ProductList = require("../models/ProductList");
const Products = require("../models/Product");

const prodList = [
  "T31P",
  "T31W",
  "T33G",
  "T34W",
  "T43U",
  "T46U",
  "T53",
  "T54W",
  "T57W",
  "W76P",
  "PSU-UK",
  "PSU-UK-T3",
  "BT41",
  "WF40",
  "WF50",
  "CP-6851",
  "CP-7821",
  "CP-7841",
  "CP-6800-PWR-UK",
  "CP-7800-PWR-UK",
  "H3",
  "H3W",
  "GXP1625",
  "snomD140",
  "snomD150",
  "snomD717",
  "ATA192",
  "HT-801",
  "HT-802",
  "HC220",
  "HX220",
  "DGA0122",
  "Vigor2763ac",
  "VR1210V-V2",
  "VX230V",
];

const getProducts = async (req, res) => {
  try {
    const username = process.env.PROVU_USER;
    const password = process.env.PROVU_PASS;

    const response = await axios.get(process.env.PROVU_URL, {
      auth: {
        username: username,
        password: password,
      },
    });

    // Assuming the response data structure is { data: { items: { item1: {...}, item2: {...} } } }
    const items = response.data.items;

    let filteredProducts = Object.values(items).filter((item) => {
      return prodList.includes(item.item); // Ensure 'item.item' is correct based on your item structure
    });

    //Fetch extra products from db
    const extraProducts = await Products.find({});

    console.log(extraProducts);
    if (extraProducts) {
      filteredProducts = [...filteredProducts, ...extraProducts];
    }

    res.status(StatusCodes.OK).json(filteredProducts);
  } catch (error) {
    throw new BadRequestError("Failed to fetch products... Try again later");
  }
};

const updateProductList = async (req, res) => {
  try {
    if (!req.file) {
      throw new BadRequestError("No file uploaded");
    }

    // The file buffer is available in req.file.buffer
    const buffer = req.file.buffer;

    // Read the Excel file from buffer
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // Assume first sheet
    const worksheet = workbook.Sheets[sheetName];

    // Extract data from column 2 (B)
    const columnBData = [];
    let rowIndex = 2; // Start from row 2 (assuming row 1 is header)
    while (true) {
      const cellAddress = "B" + rowIndex;
      const cell = worksheet[cellAddress];
      if (!cell) break; // Stop if cell is undefined (end of data)
      columnBData.push(cell.v); // 'v' property contains the value
      rowIndex++;
    }

    // Prepare data for MongoDB
    const productNames = columnBData.map((name) => ({ name }));

    // Save to MongoDB
    const productList = await ProductList.findOneAndUpdate(
      {}, // empty filter to update the first document or create if doesn't exist
      {
        $set: { productNames: productNames },
        $currentDate: { lastUpdated: true },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log("Product list updated successfully");
    res.status(200).json({
      message: "Product list updated successfully",
      data: productList,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(400).json({ error: error.message });
  }
};

const addProduct = async (req, res) => {
  const product = await Products.create(req.body);
  res
    .status(StatusCodes.CREATED)
    .json({ msg: "Product added successfully", product });
};

const deleteProduct = async (req, res) => {
  try {
    const { product_name } = req.query;
    console.log(req.params);

    const result = await Products.findOneAndDelete({ item: product_name });


    if (!result) {
      console.log("Product not found for deletion");
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: "Product not found" });
    }

    res
      .status(StatusCodes.OK)
      .json({ msg: "Product deleted successfully", result });
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Error deleting product", error: error.message });
  }
};

const updateProduct = async (req, res) => {
  const { item, ...updateData } = req.body;

  if (!item) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Product name (item) is required" });
  }

  try {
    const product = await Products.findOneAndUpdate({ item }, updateData, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: "Product not found" });
    }

    res
      .status(StatusCodes.OK)
      .json({ msg: "Product updated successfully", product });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ msg: "Error updating product", error: error.message });
  }
};

module.exports = { getProducts, updateProductList, addProduct, deleteProduct, updateProduct };
