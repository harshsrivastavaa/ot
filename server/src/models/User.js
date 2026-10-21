const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['Employee', 'Manager', 'Admin'], required: true },
    department: { type: String, trim: true, default: null },
    weeklyCap: { type: Number, min: 0, max: 60, default: 12 },
    active: { type: Boolean, default: true },
    approvalVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);
userSchema.index({ department: 1, role: 1 });
module.exports = mongoose.model('User', userSchema);
