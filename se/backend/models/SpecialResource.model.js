import mongoose from 'mongoose';

const specialResourceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['physics_lab','chemistry_lab','bio_lab','computer_lab','library','pt_ground','art_room','music_room','other'],
    required: true,
  },
  capacity:    { type: Number },
  description: { type: String },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('SpecialResource', specialResourceSchema);
