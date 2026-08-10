// Vercel serverless entry — path MUST stay: server/api/index.js
const path = require('path');

// Load root .env when file exists (local + if committed on Vercel)
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch (e) {}

// Internship fallbacks — no Vercel dashboard env required
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI =
    'mongodb+srv://managerent:managerent2026@cluster0.kpg1dcu.mongodb.net/rental-master?retryWrites=true&w=majority';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET =
    'RentMaster_Secure_JWT_Key_2024_For_Property_Management';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const app = require('../app');

// Vercel uses the exported Express app as the serverless handler
module.exports = app;
