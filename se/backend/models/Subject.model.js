import mongoose from 'mongoose';

// applicableGroups: for higher secondary subjects — which groups can take this subject
// e.g. Biology is only for science_biology group
// Empty array = applicable to all groups (common subjects like English, Tamil)

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  type: {
    type: String,
    enum: ['regular', 'lab', 'library', 'pt', 'assembly', 'activity', 'language'],
    default: 'regular',
  },
  periodsPerWeek: { type: Number, default: 5, min: 1 },
  color:          { type: String, default: '#4F46E5' },
  duration:       { type: Number, default: 45 }, // minutes

  // Which grade levels this subject applies to
  applicableGradeLevels: {
    type: [{ type: String, enum: ['pre_primary','primary','middle','secondary','higher_secondary'] }],
    required: true,
    validate: { validator: v => Array.isArray(v) && v.length > 0, message: 'At least one grade level required' },
  },

  // For Grade 11 & 12: which subject groups can take this subject
  // Empty = all groups / not group-specific (e.g. English, Tamil, Physical Education)
  // Non-empty = only these groups (e.g. Biology → ['science_biology'])
  applicableGroups: {
    type: [{ type: String, enum: ['science_biology','science_maths','commerce','arts'] }],
    default: [],
  },

  isGroupSpecific: { type: Boolean, default: false }, // true if applicableGroups is non-empty

  // Resource-based periods
  isResourceBased: { type: Boolean, default: false },
  resourceType: {
    type: String,
    enum: ['library','physics_lab','chemistry_lab','bio_lab','computer_lab','pt_ground', null],
    default: null,
  },

  isElective:  { type: Boolean, default: false },
  isLanguage:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

subjectSchema.pre('save', function (next) {
  this.isGroupSpecific = this.applicableGroups && this.applicableGroups.length > 0;
  next();
});

subjectSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const nextGroups = update.applicableGroups ?? update.$set?.applicableGroups;

  if (nextGroups !== undefined) {
    const isGroupSpecific = Array.isArray(nextGroups) && nextGroups.length > 0;
    update.isGroupSpecific = isGroupSpecific;
    update.$set = { ...(update.$set || {}), isGroupSpecific };
    this.setUpdate(update);
  }

  next();
});

export default mongoose.model('Subject', subjectSchema);
