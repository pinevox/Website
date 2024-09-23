const mongoose = require("mongoose");

const ProductListSchema = mongoose.Schema(
  {
    productNames: [String],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProuctList", ProductListSchema);
