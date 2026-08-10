const mongoose = require('mongoose');

/**
 * Serverless-safe MongoDB connection.
 * Vercel re-uses the same Lambda container between invocations,
 * so we cache the connection on `global` to avoid pool explosion.
 */
let cached = global.__rentmasterMongo;

if (!cached) {
  cached = global.__rentmasterMongo = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to .env / Vercel env variables.');
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        autoIndex: true,
      })
      .then((m) => {
        console.log(`✅ MongoDB Atlas Connected → ${m.connection.host}/${m.connection.name}`);
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        console.error('❌ MongoDB connection error:', err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;