const mongoose = require('mongoose');
const signupSchema = new mongoose.Schema(
  {
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'withdrawn', 'cancelled'],
      default: 'pending',
    },
    active: { type: Boolean, default: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
signupSchema.index(
  { slot: 1, employee: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
signupSchema.index({ employee: 1, status: 1 });
module.exports = mongoose.model('Signup', signupSchema);
