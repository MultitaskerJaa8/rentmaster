const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
      maxlength: 100,
    },
    code: { type: String, unique: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ['Apartment', 'Villa', 'Studio', 'Penthouse', 'Duplex', 'Commercial', 'Society'],
      default: 'Apartment',
    },
    description: { type: String, trim: true, maxlength: 800, default: '' },
    address: {
      line1: { type: String, required: [true, 'Address is required'], trim: true },
      city: { type: String, required: [true, 'City is required'], trim: true },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalUnits: { type: Number, default: 1, min: 1 },
    occupiedUnits: { type: Number, default: 0, min: 0 },
    rentAmount: { type: Number, default: 0, min: 0 },
    bedrooms: { type: Number, default: 1, min: 0 },
    bathrooms: { type: Number, default: 1, min: 0 },
    areaSqft: { type: Number, default: 0, min: 0 },
    imageUrl: {
      type: String,
      default:
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70',
    },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Under Maintenance', 'Inactive'],
      default: 'Available',
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

propertySchema.virtual('occupancyRate').get(function () {
  if (!this.totalUnits) return 0;
  return Math.round((this.occupiedUnits / this.totalUnits) * 100);
});

propertySchema.virtual('fullAddress').get(function () {
  const a = this.address || {};
  return [a.line1, a.city, a.state, a.pincode, a.country].filter(Boolean).join(', ');
});

propertySchema.pre('validate', async function (next) {
  if (!this.code) {
    const prefix = (this.name || 'PROP').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'PRP';
    this.code = `${prefix}-${Date.now().toString().slice(-6)}`;
  }
  next();
});

propertySchema.index({ owner: 1 });
propertySchema.index({ 'address.city': 1 });
propertySchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.models.Property || mongoose.model('Property', propertySchema);