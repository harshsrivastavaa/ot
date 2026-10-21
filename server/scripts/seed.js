require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function seed() {
  if (!process.env.MONGODB_URI || !process.env.SEED_PASSWORD)
    throw new Error('Set MONGODB_URI and SEED_PASSWORD before seeding.');

  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD, 12);
  const people = [
    {
      name: 'OT Hub Admin',
      email: 'admin@othub.com',
      role: 'Admin',
      department: null,
      weeklyCap: 12,
    },
    {
      name: 'Production Manager',
      email: 'manager@othub.com',
      role: 'Manager',
      department: 'Production',
      weeklyCap: 12,
    },
    {
      name: 'Production Employee',
      email: 'employee@othub.com',
      role: 'Employee',
      department: 'Production',
      weeklyCap: 12,
    },
  ];
  for (const person of people)
    await User.updateOne(
      { email: person.email },
      { $set: { ...person, passwordHash, active: true } },
      { upsert: true },
    );
  console.log(
    `Seeded demo accounts. Password is the value of SEED_PASSWORD. (${people.map((person) => person.email).join(', ')})`,
  );
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
