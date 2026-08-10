const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

/* ---------------- Core middleware ---------------- */
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  })
);

if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
  })
);

/* ------- Ensure DB connection before any /api hit (serverless safe) ------- */
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again in a moment.',
    });
  }
});

/* ---------------- Routes ---------------- */
app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    service: 'RentMaster API',
    status: 'live',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  })
);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/amenities', require('./routes/amenityRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

/* ---------------- Errors ---------------- */
app.use(notFound);
app.use(errorHandler);

module.exports = app;