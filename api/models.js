const mongoose = require('mongoose');

// todo: encrypt pw
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, index: true },
  password: String,
  peerId: { type: String, index: true }
}, { timestamps: true });

const TaskSchema = new mongoose.Schema({
  ownerId: { type: String, index: true },
  code: String,
  data: mongoose.Schema.Types.Mixed,
  result: mongoose.Schema.Types.Mixed,
  completedAt: Date,
  peers: { type: [String], default: [] }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Task = mongoose.model('Task', TaskSchema);

module.exports = {
  User,
  Task
};
