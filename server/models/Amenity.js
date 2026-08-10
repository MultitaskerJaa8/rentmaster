const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Amenity name is required'], trim: true, maxlength: 80 },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    category: {
      type: String,
      enum: [
        'Gym',
        'Swimming Pool',
        'Clubhouse',
        'Party Hall',
        'Tennis Court',
        'Parking',
        'Co-working',
        'Garden',
        'Other',
      ],
      default: 'Other',
    },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    location: { type: String, trim: true, default: '' },
    capacity: { type: Number, default: 1, min: 1 },
    // Operating hours in 24h "HH:mm"
    openTime: { type: String, default: '06:00', match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time'] },
    closeTime: { type: String, default: '22:00', match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time'] },
    slotDurationMins: { type: Number, default: 60, min: 15, max: 480 },
    maxHoursPerBooking: { type: Number, default: 3, min: 1, max: 12 },
    bookingFee: { type: Number, default: 0, min: 0 },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Unavailable', 'Under Maintenance'],
      default: 'Available',
    },
    imageUrl: {
      type: String,
      default:
        'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=70',
    },
    rules: [{ type: String, trim: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

amenitySchema.index({ property: 1 });
amenitySchema.index({ availabilityStatus: 1 });

module.exports = mongoose.models.Amenity || mongoose.model('Amenity', amenitySchema);