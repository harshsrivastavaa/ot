const mongoose = require('mongoose');
const slotSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    department: { type: String, required: true, trim: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    requiredHeadcount: { type: Number, required: true, min: 1, max: 50 },
    status: { type: String, enum: ['open', 'full', 'cancelled'], default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
slotSchema.index({ department: 1, startAt: 1, status: 1 });
module.exports = mongoose.model('Slot', slotSchema);
