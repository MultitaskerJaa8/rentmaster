const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Load .env if present (local + vercel if file committed) ──
try {
  const dotenv = require('dotenv');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  else dotenv.config();
} catch (e) {}

// ── HARD FALLBACKS (internship – no Vercel dashboard env needed) ──
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://managerent:managerent2026@cluster0.kpg1dcu.mongodb.net/rental-master?retryWrites=true&w=majority';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'RentMaster_Secure_JWT_Key_2024_For_Property_Management';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Mongo cache (serverless) ──
let cached = global._rmMongoose;
if (!cached) cached = global._rmMongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 15000
      })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB fail:', err.message);
    return res.status(500).json({
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// ── Schemas ──
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'owner', 'tenant'], default: 'tenant' },
    phone: { type: String, default: '' },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.matchPassword = function (pw) {
  return bcrypt.compare(pw, this.password);
};

const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['apartment', 'house', 'condo', 'commercial', 'villa'],
      default: 'apartment'
    },
    units: { type: Number, default: 1 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
    rent: { type: Number, default: 0 },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' }
  },
  { timestamps: true }
);

const maintenanceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest', 'cleaning', 'other'],
      default: 'other'
    },
    images: [String],
    resolution: { type: String, default: '' },
    resolvedAt: Date
  },
  { timestamps: true }
);

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    type: {
      type: String,
      enum: ['gym', 'pool', 'clubhouse', 'parking', 'garden', 'laundry', 'playground', 'rooftop', 'other'],
      default: 'other'
    },
    status: {
      type: String,
      enum: ['available', 'unavailable', 'maintenance'],
      default: 'available'
    },
    image: { type: String, default: '' },
    rules: { type: String, default: '' },
    capacity: { type: Number, default: 10 },
    operatingHours: {
      open: { type: String, default: '06:00' },
      close: { type: String, default: '22:00' }
    }
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    amenity: { type: mongoose.Schema.Types.ObjectId, ref: 'Amenity', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingDate: { type: Date, required: true },
    checkInTime: { type: String, required: true },
    checkOutTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['upcoming', 'checked-in', 'checked-out', 'cancelled'],
      default: 'upcoming'
    },
    purpose: { type: String, default: '' }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Property = mongoose.models.Property || mongoose.model('Property', propertySchema);
const MaintenanceRequest =
  mongoose.models.MaintenanceRequest ||
  mongoose.model('MaintenanceRequest', maintenanceSchema);
const Amenity = mongoose.models.Amenity || mongoose.model('Amenity', amenitySchema);
const AmenityBooking =
  mongoose.models.AmenityBooking || mongoose.model('AmenityBooking', bookingSchema);

function signToken(id) {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
}

async function protect(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(h.split(' ')[1], JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

// ═══════════════ ROUTES ═══════════════

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mongo: mongoose.connection.readyState,
    time: new Date().toISOString()
  });
});

// AUTH
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, password required' });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'tenant',
      phone: phone || ''
    });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      token: signToken(user._id)
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });
    const ok = await user.matchPassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      property: user.property,
      avatar: user.avatar,
      token: signToken(user._id)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('property');
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// USERS
app.get('/api/users', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.user.role === 'owner') {
      const props = await Property.find({ owner: req.user._id }).select('_id');
      filter.property = { $in: props.map((p) => p._id) };
    }
    const users = await User.find(filter).populate('property', 'name address').sort({ createdAt: -1 });
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/users/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('property');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/api/users/:id', protect, async (req, res) => {
  try {
    if (req.body.role && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can change roles' });
    }
    const updated = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
      .populate('property');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PROPERTIES
app.get('/api/properties', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'owner') filter.owner = req.user._id;
    else if (req.user.role === 'tenant' && req.user.property) filter._id = req.user.property;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { address: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    const list = await Property.find(filter).populate('owner', 'name email phone').sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/properties/:id', protect, async (req, res) => {
  try {
    const p = await Property.findById(req.params.id).populate('owner', 'name email phone');
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/properties', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const data = {
      ...req.body,
      owner: req.user.role === 'admin' ? req.body.owner || req.user._id : req.user._id
    };
    const p = await Property.create(data);
    res.status(201).json(await Property.findById(p._id).populate('owner', 'name email phone'));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/api/properties/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const p = await Property.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'owner' && p.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const updated = await Property.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
      .populate('owner', 'name email phone');
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/properties/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const p = await Property.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'owner' && p.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// MAINTENANCE
app.get('/api/maintenance', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'tenant') filter.requestedBy = req.user._id;
    else if (req.user.role === 'owner') {
      const props = await Property.find({ owner: req.user._id }).select('_id');
      filter.property = { $in: props.map((p) => p._id) };
    }
    if (req.query.status) filter.status = req.query.status;
    const list = await MaintenanceRequest.find(filter)
      .populate('property', 'name address')
      .populate('requestedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/maintenance', protect, async (req, res) => {
  try {
    const { title, description, property, priority, category } = req.body;
    if (!title || !description || !property) {
      return res.status(400).json({ message: 'Title, description, property required' });
    }
    const doc = await MaintenanceRequest.create({
      title,
      description,
      property,
      requestedBy: req.user._id,
      priority: priority || 'medium',
      category: category || 'other'
    });
    res.status(201).json(
      await MaintenanceRequest.findById(doc._id)
        .populate('property', 'name address')
        .populate('requestedBy', 'name email')
    );
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/api/maintenance/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const cur = await MaintenanceRequest.findById(req.params.id);
    if (!cur) return res.status(404).json({ message: 'Not found' });
    if (req.body.status === 'completed' && cur.status !== 'completed') {
      req.body.resolvedAt = new Date();
    }
    const updated = await MaintenanceRequest.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
      .populate('property', 'name address')
      .populate('requestedBy', 'name email')
      .populate('assignedTo', 'name email');
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/maintenance/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    await MaintenanceRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// AMENITIES + BOOKINGS
app.get('/api/amenities/bookings/all', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'tenant') filter.bookedBy = req.user._id;
    else if (req.user.role === 'owner') {
      const props = await Property.find({ owner: req.user._id }).select('_id');
      filter.property = { $in: props.map((p) => p._id) };
    }
    const list = await AmenityBooking.find(filter)
      .populate('amenity', 'name type image')
      .populate('property', 'name address')
      .populate('bookedBy', 'name email phone')
      .sort({ bookingDate: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/api/amenities/bookings/:bookingId', protect, async (req, res) => {
  try {
    const updated = await AmenityBooking.findByIdAndUpdate(
      req.params.bookingId,
      { $set: req.body },
      { new: true }
    )
      .populate('amenity', 'name type')
      .populate('property', 'name')
      .populate('bookedBy', 'name email');
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/amenities', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'owner') {
      const props = await Property.find({ owner: req.user._id }).select('_id');
      filter.property = { $in: props.map((p) => p._id) };
    } else if (req.user.role === 'tenant' && req.user.property) {
      filter.property = req.user.property;
    }
    const list = await Amenity.find(filter).populate('property', 'name address').sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/amenities', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const a = await Amenity.create(req.body);
    res.status(201).json(await Amenity.findById(a._id).populate('property', 'name address'));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/api/amenities/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const updated = await Amenity.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true })
      .populate('property', 'name address');
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/amenities/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    await AmenityBooking.deleteMany({ amenity: req.params.id });
    await Amenity.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/amenities/:id/book', protect, async (req, res) => {
  try {
    const { bookingDate, checkInTime, checkOutTime, purpose } = req.body;
    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) return res.status(404).json({ message: 'Amenity not found' });
    if (amenity.status !== 'available') {
      return res.status(400).json({ message: 'Amenity not available' });
    }
    if (!bookingDate || !checkInTime || !checkOutTime) {
      return res.status(400).json({ message: 'Date/times required' });
    }
    if (checkInTime >= checkOutTime) {
      return res.status(400).json({ message: 'Invalid time range' });
    }

    const bookDate = new Date(bookingDate);
    bookDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(bookDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const conflict = await AmenityBooking.findOne({
      amenity: req.params.id,
      bookingDate: { $gte: bookDate, $lt: nextDay },
      status: { $in: ['upcoming', 'checked-in'] },
      checkInTime: { $lt: checkOutTime },
      checkOutTime: { $gt: checkInTime }
    });
    if (conflict) {
      return res.status(409).json({
        message: `Conflict: already booked ${conflict.checkInTime}-${conflict.checkOutTime}`
      });
    }

    const booking = await AmenityBooking.create({
      amenity: req.params.id,
      property: amenity.property,
      bookedBy: req.user._id,
      bookingDate: bookDate,
      checkInTime,
      checkOutTime,
      purpose: purpose || ''
    });

    res.status(201).json(
      await AmenityBooking.findById(booking._id)
        .populate('amenity', 'name type')
        .populate('property', 'name')
        .populate('bookedBy', 'name email')
    );
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DASHBOARD
app.get('/api/dashboard/stats', protect, async (req, res) => {
  try {
    const propertyFilter = {};
    const maintenanceFilter = {};
    const bookingFilter = {};

    if (req.user.role === 'owner') {
      const props = await Property.find({ owner: req.user._id }).select('_id');
      const ids = props.map((p) => p._id);
      propertyFilter.owner = req.user._id;
      maintenanceFilter.property = { $in: ids };
      bookingFilter.property = { $in: ids };
    } else if (req.user.role === 'tenant') {
      maintenanceFilter.requestedBy = req.user._id;
      bookingFilter.bookedBy = req.user._id;
      if (req.user.property) propertyFilter._id = req.user.property;
    }

    const totalProperties = await Property.countDocuments(propertyFilter);
    const totalUsers = await User.countDocuments(req.user.role === 'admin' ? {} : { role: 'tenant' });
    const totalAmenities = await Amenity.countDocuments({});

    const maintenanceTotal = await MaintenanceRequest.countDocuments(maintenanceFilter);
    const maintenancePending = await MaintenanceRequest.countDocuments({
      ...maintenanceFilter,
      status: 'pending'
    });
    const maintenanceInProgress = await MaintenanceRequest.countDocuments({
      ...maintenanceFilter,
      status: 'in-progress'
    });
    const maintenanceCompleted = await MaintenanceRequest.countDocuments({
      ...maintenanceFilter,
      status: 'completed'
    });

    const bookingsTotal = await AmenityBooking.countDocuments(bookingFilter);
    const bookingsUpcoming = await AmenityBooking.countDocuments({
      ...bookingFilter,
      status: 'upcoming'
    });
    const bookingsCheckedIn = await AmenityBooking.countDocuments({
      ...bookingFilter,
      status: 'checked-in'
    });
    const bookingsCompleted = await AmenityBooking.countDocuments({
      ...bookingFilter,
      status: 'checked-out'
    });
    const bookingsCancelled = await AmenityBooking.countDocuments({
      ...bookingFilter,
      status: 'cancelled'
    });

    const recentMaintenance = await MaintenanceRequest.find(maintenanceFilter)
      .populate('property', 'name')
      .populate('requestedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentBookings = await AmenityBooking.find(bookingFilter)
      .populate('amenity', 'name type')
      .populate('bookedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      properties: totalProperties,
      users: totalUsers,
      amenities: totalAmenities,
      maintenance: {
        total: maintenanceTotal,
        pending: maintenancePending,
        inProgress: maintenanceInProgress,
        completed: maintenanceCompleted,
        completionRate:
          maintenanceTotal > 0
            ? Math.round((maintenanceCompleted / maintenanceTotal) * 100)
            : 0,
        byCategory: [],
        byPriority: []
      },
      bookings: {
        total: bookingsTotal,
        upcoming: bookingsUpcoming,
        checkedIn: bookingsCheckedIn,
        completed: bookingsCompleted,
        cancelled: bookingsCancelled
      },
      recentMaintenance,
      recentBookings
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: `API not found: ${req.method} ${req.originalUrl}` });
});

module.exports = app;
