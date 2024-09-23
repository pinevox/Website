const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const { required } = require("joi");
const secret = process.env.JWT_SECRET;
const lifeTime = process.env.JWT_LIFETME;
const refreshLifeTime = process.env.JWT_REFRESH_LIFETME;

const UserSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please provide a first name"],
      minlength: 1,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Please provide a last name"],
      minlength: 1,
      maxlength: 50,
    },
    userEmail: {
      type: String,
      required: [true, "Please provide an email"],
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ],
      index:true,
      sparse:true,
      unique: true
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 5,
    },
    businessName: {
      type: String,
      required: [true, "Please provide a business name"],
      minlength: 3,
      maxlength: 50,
    },
    phone: {
      type: String,
      required: [true, "Please provide a phone number"],
      minlength: 3,
      maxlength: 50,
    },
    altPhone: {
      type: String,
      required: [true, "Please provide an alternate phone number"],
      minlength: 3,
      maxlength: 50,
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
    status: {
      type: String,
      enum: ['remService' , 'remAddress' , 'remMandate', 'active'],
      default: 'remService'
    },

    passwordResetToken: String,
    passwordResetExpires: Date
  },
  { timestamps: true }
);

UserSchema.pre("save", async function () {
  //Encode password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function(candidatePassword){
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
}

UserSchema.methods.createJwt = function () {
  return jwt.sign(
    { userId: this._id, username: this.firstName, userEmail: this.userEmail, role: this.role },
    secret,
    { expiresIn: lifeTime }
  );
};

UserSchema.methods.createRefreshJwt = function () {
  return jwt.sign(
    { userId: this._id, username: this.firstName, userEmail: this.userEmail, role: this.role },
    secret,
    { expiresIn: refreshLifeTime }
  );
};

UserSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Token expires in 10 minutes
  
  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
