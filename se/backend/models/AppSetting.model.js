import mongoose from 'mongoose';

const masterOptionSchema = new mongoose.Schema({
  value:    { type: String, required: true },
  label:    { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const appSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },

  // School identity
  schoolName:    { type: String, default: 'School Name' },
  schoolCode:    { type: String, default: 'SCH001' },
  schoolAddress: { type: String, default: '' },
  schoolPhone:   { type: String, default: '' },
  schoolEmail:   { type: String, default: '' },
  schoolLogo:    { type: String, default: '' },
  affiliationNo: { type: String, default: '' },
  boardName:     { type: String, default: 'CBSE' },
  currentAcademicYear: { type: String, default: '' },

  // Timetable settings
  schoolStartTime:   { type: String, default: '08:00' },
  schoolEndTime:     { type: String, default: '15:30' },
  periodsPerDay:     { type: Number, default: 8 },
  periodDurationMins:{ type: Number, default: 45 },
  workingDays:       { type: [String], default: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] },
  shortBreakAfterPeriod: { type: Number, default: 2 },
  lunchBreakAfterPeriod: { type: Number, default: 5 },
  shortBreakDurationMins:{ type: Number, default: 10 },
  lunchBreakDurationMins:{ type: Number, default: 30 },

  // Masters
  student_genders:          { type: [masterOptionSchema], default: () => ([{value:'Male',label:'Male',isActive:true},{value:'Female',label:'Female',isActive:true},{value:'Other',label:'Other',isActive:true}]) },
  student_blood_groups:     { type: [masterOptionSchema], default: () => ([{value:'A+',label:'A+',isActive:true},{value:'A-',label:'A-',isActive:true},{value:'B+',label:'B+',isActive:true},{value:'B-',label:'B-',isActive:true},{value:'O+',label:'O+',isActive:true},{value:'O-',label:'O-',isActive:true},{value:'AB+',label:'AB+',isActive:true},{value:'AB-',label:'AB-',isActive:true}]) },
  student_categories:       { type: [masterOptionSchema], default: () => ([{value:'General',label:'General',isActive:true},{value:'OBC',label:'OBC',isActive:true},{value:'SC',label:'SC',isActive:true},{value:'ST',label:'ST',isActive:true},{value:'EWS',label:'EWS',isActive:true}]) },
  student_religions:        { type: [masterOptionSchema], default: () => ([{value:'Hindu',label:'Hindu',isActive:true},{value:'Muslim',label:'Muslim',isActive:true},{value:'Christian',label:'Christian',isActive:true},{value:'Sikh',label:'Sikh',isActive:true},{value:'Other',label:'Other',isActive:true}]) },
  finance_payment_modes:    { type: [masterOptionSchema], default: () => ([{value:'cash',label:'Cash',isActive:true},{value:'online',label:'Online',isActive:true},{value:'cheque',label:'Cheque',isActive:true},{value:'dd',label:'DD',isActive:true},{value:'neft',label:'NEFT',isActive:true}]) },
  leave_types:              { type: [masterOptionSchema], default: () => ([{value:'sick',label:'Sick',isActive:true},{value:'personal',label:'Personal',isActive:true},{value:'emergency',label:'Emergency',isActive:true},{value:'other',label:'Other',isActive:true}]) },
  expense_categories:       { type: [masterOptionSchema], default: () => ([{value:'salary',label:'Salary',isActive:true},{value:'maintenance',label:'Maintenance',isActive:true},{value:'utilities',label:'Utilities',isActive:true},{value:'stationery',label:'Stationery',isActive:true},{value:'transport',label:'Transport',isActive:true},{value:'events',label:'Events',isActive:true},{value:'miscellaneous',label:'Miscellaneous',isActive:true}]) },
  inventory_categories:     { type: [masterOptionSchema], default: () => ([{value:'stationery',label:'Stationery',isActive:true},{value:'lab',label:'Lab Equipment',isActive:true},{value:'sports',label:'Sports',isActive:true},{value:'furniture',label:'Furniture',isActive:true},{value:'electronics',label:'Electronics',isActive:true},{value:'other',label:'Other',isActive:true}]) },

  // Capability/role mapping — stored as JSON string for flexibility
  capabilities: { type: mongoose.Schema.Types.Mixed, default: {} },

}, { timestamps: true });

const AppSetting = mongoose.model('AppSetting', appSettingSchema);
export default AppSetting;
