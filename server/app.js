const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Critical for Vercel serverless: connect DB before each request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    return res.status(500).json({
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Routes — paths stay /api/...
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/amenities', require('./routes/amenityRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'OK',
    message: 'RentMaster API running',
    mongo: mongoose.connection.readyState,
    entry: 'server/api/index.js',
    time: new Date().toISOString()
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
