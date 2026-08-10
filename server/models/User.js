const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name is too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [/^$|^[0-9+\-\s()]{7,18}$/, 'Please provide a valid phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'owner', 'tenant', 'staff'],
      default: 'tenant',
    },
    // For tenants -> which property they live in
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null,
    },
    unitNumber: { type: String, trim: true, default: '' },
    // For staff -> skill category
    department: {
      type: String,
      enum: ['General', 'Plumbing', 'Electrical', 'Carpentry', 'Appliance', 'Cleaning', 'Security'],
      default: 'General',
    },
    avatarColor: { type: String, default: '#6366f1' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual('initials').get(function () {
  if (!this.name) return 'U';
  return this.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.index({ role: 1 });
userSchema.index({ property: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);