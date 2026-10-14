// Creates (or promotes) the first administrator account.
//   npm run create-admin
// You can also skip the questions:
//   ADMIN_NAME="Your Name" ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run create-admin
import readline from 'node:readline';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else if (s.includes('\n') || s.includes('\r')) rl.output.write('\n');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

const name = process.env.ADMIN_NAME || (await ask('Admin name: '));
const email = (process.env.ADMIN_EMAIL || (await ask('Admin email: '))).toLowerCase();
const password = process.env.ADMIN_PASSWORD || (await ask('Admin password (min 10 characters): ', { hidden: true }));

const problems = [];
if (name.length < 2) problems.push('Name is too short.');
if (!/^\S+@\S+\.\S+$/.test(email)) problems.push('Email does not look right.');
if (password.length < 10 || password.length > 72) problems.push('Password must be 10 to 72 characters.');
if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) problems.push('Password needs letters and numbers.');
if (problems.length) {
  console.error('\n❌ ' + problems.join('\n❌ '));
  process.exit(1);
}

await connectDB();
const existing = await User.findOne({ email });
if (existing) {
  existing.role = 'admin';
  existing.status = 'active';
  existing.name = name;
  existing.password = password; // hashed automatically on save
  await existing.save();
  console.log(`\n✅ ${email} already existed. It is now an administrator and the password was updated.`);
} else {
  await User.create({ name, email, password, role: 'admin' });
  console.log(`\n✅ Administrator created: ${email}`);
}
console.log('   Log in at http://localhost:5173/admin/login');
await mongoose.disconnect();
