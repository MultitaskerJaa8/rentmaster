const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true, uppercase: true },
    amenity: { type: mongoose.Schema.Types.ObjectId, ref: 'Amenity', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Day of booking normalized to 00:00 UTC-less date string YYYY-MM-DD
    bookingDate: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'] },
    checkIn: { type: Date, required: true },   // full datetime of slot start
    checkOut: { type: Date, required: true },  // full datetime of slot end

    guests: { type: Number, default: 1, min: 1 },
    purpose: { type: String, trim: true, maxlength: 200, default: '' },

    status: {
      type: String,
      enum: ['Booked', 'CheckedIn', 'Completed', 'Cancelled', 'NoShow'],
      default: 'Booked',
    },
    actualCheckInAt: { type: Date, default: null },
    actualCheckOutAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

bookingSchema.virtual('durationHours').get(function () {
  return Math.round(((this.checkOut - this.checkIn) / 36e5) * 10) / 10;
});

bookingSchema.virtual('isLive').get(function () {
  const now = Date.now();
  return this.status === 'CheckedIn' || (now >= this.checkIn && now <= this.checkOut);
});

bookingSchema.pre('validate', function (next) {
  if (!this.bookingId) {
    this.bookingId = `BK-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
  }
  next();
});

// 🔒 Hard DB-level guard against exact duplicate slot booking
bookingSchema.index(
  { amenity: 1, checkIn: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['Booked', 'CheckedIn'] } } }
);
bookingSchema.index({ amenity: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

module.exports =
  mongoose.models.AmenityBooking || mongoose.model('AmenityBooking', bookingSchema);