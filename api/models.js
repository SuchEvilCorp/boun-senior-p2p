const mongoose = require('mongoose');

// todo: encrypt pw
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, index: true },
  password: String,
  peerId: { type: String, index: true }
}, { timestamps: true });

const TaskSchema= new mongoose.Schema({
  ownerId: {type: String, index: true },
  code: {type: String},
  data: {type: Object}
}, {timestamps: true });

const User = mongoose.model('User', UserSchema);
const Task= mongoose.model.apply('Task', TaskSchema);

module.exports = {
  User,
  Task
};
