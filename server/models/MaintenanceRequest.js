const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'tenant' },
    text: { type: String, required: true, trim: true, maxlength: 600 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    byName: { type: String, default: 'System' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const maintenanceSchema = new mongoose.Schema(
  {
    ticketId: { type: String, unique: true, uppercase: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    title: { type: String, required: [true, 'Issue title is required'], trim: true, maxlength: 120 },
    description: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      maxlength: 1500,
    },
    category: {
      type: String,
      enum: ['Plumbing', 'Electrical', 'Carpentry', 'Appliance', 'Cleaning', 'Security', 'Other'],
      default: 'Other',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    unitNumber: { type: String, trim: true, default: '' },
    imageUrl: { type: String, default: '' },
    resolutionNote: { type: String, default: '', maxlength: 800 },
    resolvedAt: { type: Date, default: null },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    timeline: [timelineSchema],
    comments: [commentSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Resolution time in hours (KPI ≤ 48h)
maintenanceSchema.virtual('resolutionHours').get(function () {
  if (!this.resolvedAt) return null;
  return Math.round(((this.resolvedAt - this.createdAt) / 36e5) * 10) / 10;
});

maintenanceSchema.virtual('ageHours').get(function () {
  const end = this.resolvedAt || new Date();
  return Math.round(((end - this.createdAt) / 36e5) * 10) / 10;
});

maintenanceSchema.virtual('isOverdue').get(function () {
  if (this.status === 'Completed' || this.status === 'Cancelled') return false;
  return (Date.now() - this.createdAt) / 36e5 > 48;
});

maintenanceSchema.pre('validate', function (next) {
  if (!this.ticketId) {
    this.ticketId = `MR-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
  }
  if (!this.timeline || this.timeline.length === 0) {
    this.timeline = [{ status: 'Pending', note: 'Request created', byName: 'Tenant', at: new Date() }];
  }
  next();
});

maintenanceSchema.index({ property: 1, status: 1 });
maintenanceSchema.index({ raisedBy: 1 });
maintenanceSchema.index({ assignedTo: 1 });
maintenanceSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.MaintenanceRequest || mongoose.model('MaintenanceRequest', maintenanceSchema);