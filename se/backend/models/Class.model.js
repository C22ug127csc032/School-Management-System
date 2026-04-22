import mongoose from 'mongoose';

// classType: 'standard' = regular class with all subjects
//            'group'    = higher secondary group (Maths Biology, Computer Maths, Business Maths, Arts Computer)
const classSchema = new mongoose.Schema({
  grade: {
    type: String,
    required: true,
    enum: ['Pre-KG','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'],
  },
  section:     { type: String, trim: true, default: '' }, // 'A', 'B', 'C' or blank for single-section schools
  displayName: { type: String },  // e.g. "Grade 6 - A" or "Grade 6"
  gradeLevel: {
    type: String,
    enum: ['pre_primary','primary','middle','secondary','higher_secondary'],
    required: true,
  },

  // For Grade 11 & 12 — group-based subject assignment
  classType: {
    type: String,
    enum: ['standard', 'group'],
    default: 'standard',
  },
  groupName: {
    type: String,
    enum: ['science_biology', 'science_maths', 'commerce', 'arts', null],
    default: null,
  },

  academicYear: { type: String, required: true },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  room:         { type: String },
  capacity:     { type: Number, default: 40 },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

classSchema.index({ grade: 1, section: 1, academicYear: 1, groupName: 1 }, { unique: true });

function assignDerivedClassFields(doc) {
  if (!doc) return;

  const g = doc.grade;
  if (['Pre-KG','LKG','UKG'].includes(g)) doc.gradeLevel = 'pre_primary';
  else if (['1','2','3','4','5'].includes(g)) doc.gradeLevel = 'primary';
  else if (['6','7','8'].includes(g)) doc.gradeLevel = 'middle';
  else if (['9','10'].includes(g)) doc.gradeLevel = 'secondary';
  else if (['11','12'].includes(g)) doc.gradeLevel = 'higher_secondary';

  const gradePrefix = isNaN(doc.grade) ? doc.grade : `Grade ${doc.grade}`;
  const groupLabels = {
    science_biology: 'Maths Biology',
    science_maths: 'Computer Maths',
    commerce: 'Business Maths',
    arts: 'Arts Computer',
  };

  const normalizedSection = String(doc.section || '').trim().toUpperCase();
  doc.section = normalizedSection;
  doc.displayName = normalizedSection ? `${gradePrefix} - ${normalizedSection}` : gradePrefix;
  if (doc.groupName) {
    doc.displayName += ` (${groupLabels[doc.groupName] || doc.groupName})`;
  }
}

classSchema.pre('validate', function (next) {
  assignDerivedClassFields(this);
  next();
});

classSchema.pre('save', function (next) {
  if (!this.displayName) {
    const gradePrefix = isNaN(this.grade) ? this.grade : `Grade ${this.grade}`;
      this.displayName = this.section ? `${gradePrefix} - ${this.section}` : gradePrefix;
      if (this.groupName) {
        const groupLabels = {
        science_biology: 'Maths Biology',
        science_maths:   'Computer Maths',
        commerce:        'Business Maths',
        arts:            'Arts Computer',
        };
        this.displayName += ` (${groupLabels[this.groupName] || this.groupName})`;
      }
  }
  next();
});

export default mongoose.model('Class', classSchema);
