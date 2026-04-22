import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.model.js';
import Class from '../models/Class.model.js';
import AppSetting from '../models/AppSetting.model.js';

const AY = '2024-25';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const existingAdmin = await User.findOne({ role: 'super_admin' });
  if (!existingAdmin) {
    await User.create({
      name: 'Super Admin',
      phone: '9000000001',
      email: 'admin@school.edu',
      password: 'admin@123',
      role: 'super_admin',
      isActive: true,
    });
    console.log('Super admin created: admin@school.edu / admin@123');
  } else {
    console.log('Super admin already exists, skipping.');
  }

  await AppSetting.findOneAndUpdate(
    { key: 'global' },
    {
      key: 'global',
      schoolName: 'Sunrise Public School',
      schoolCode: 'SPS001',
      schoolAddress: '123 School Road, Chennai, Tamil Nadu',
      boardName: 'CBSE',
      currentAcademicYear: AY,
      schoolStartTime: '08:30',
      schoolEndTime: '15:30',
      periodsPerDay: 8,
      periodDurationMins: 45,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      shortBreakAfterPeriod: 2,
      lunchBreakAfterPeriod: 5,
      shortBreakDurationMins: 10,
      lunchBreakDurationMins: 30,
    },
    { upsert: true }
  );
  console.log('App settings seeded');

  const standardClasses = [
    ...['1', '2', '3', '4', '5'].flatMap(grade => ['A', 'B'].map(section => ({ grade, section, classType: 'standard' }))),
    ...['6', '7', '8'].flatMap(grade => ['A', 'B', 'C'].map(section => ({ grade, section, classType: 'standard' }))),
    ...['9', '10'].flatMap(grade => ['A', 'B', 'C'].map(section => ({ grade, section, classType: 'standard' }))),
  ];

  const groupClasses = [
    { grade: '11', section: 'A', classType: 'group', groupName: 'science_biology' },
    { grade: '11', section: 'B', classType: 'group', groupName: 'science_maths' },
    { grade: '11', section: 'C', classType: 'group', groupName: 'commerce' },
    { grade: '11', section: 'D', classType: 'group', groupName: 'arts' },
    { grade: '12', section: 'A', classType: 'group', groupName: 'science_biology' },
    { grade: '12', section: 'B', classType: 'group', groupName: 'science_maths' },
    { grade: '12', section: 'C', classType: 'group', groupName: 'commerce' },
    { grade: '12', section: 'D', classType: 'group', groupName: 'arts' },
  ];

  for (const cls of [...standardClasses, ...groupClasses]) {
    await Class.findOneAndUpdate(
      {
        grade: cls.grade,
        section: cls.section,
        academicYear: AY,
        groupName: cls.groupName || null,
      },
      { ...cls, academicYear: AY },
      { upsert: true, new: true }
    );
  }
  console.log('Classes seeded');

  console.log('\nSeed complete!');
  console.log('Login: admin@school.edu | password: admin@123');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
