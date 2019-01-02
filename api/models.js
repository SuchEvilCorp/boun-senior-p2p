const mongoose = require('mongoose');

// todo: encrypt pw
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, index: true },
  password: String,
  peerId: { type: String, index: true }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

module.exports = {
  User
};
