/**
 * RentMaster — Database Seeder
 * Usage:
 *   npm run seed           -> wipe + insert realistic demo data
 *   npm run seed:destroy   -> wipe everything
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const mongoose = require('mongoose');
const connectDB = require('./server/config/db');

const User = require('./server/models/User');
const Property = require('./server/models/Property');
const Amenity = require('./server/models/Amenity');
const AmenityBooking = require('./server/models/AmenityBooking');
const MaintenanceRequest = require('./server/models/MaintenanceRequest');

const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const at = (dateStr, hhmm) => new Date(`${dateStr}T${hhmm}:00`);
const hoursAgo = (h) => new Date(Date.now() - h * 36e5);

const destroy = async () => {
  await Promise.all([
    User.deleteMany(),
    Property.deleteMany(),
    Amenity.deleteMany(),
    AmenityBooking.deleteMany(),
    MaintenanceRequest.deleteMany(),
  ]);
  console.log('🗑️  All collections cleared');
};

const seed = async () => {
  await destroy();

  /* ---------------- USERS ---------------- */
  const admin = await User.create({
    name: 'Aarav Sharma', email: 'admin@rentmaster.com', password: 'admin123',
    role: 'admin', phone: '+91 98100 11111', avatarColor: '#6366f1',
  });

  const owner1 = await User.create({
    name: 'Priya Mehta', email: 'owner@rentmaster.com', password: 'owner123',
    role: 'owner', phone: '+91 98200 22222', avatarColor: '#0ea5e9',
  });

  const owner2 = await User.create({
    name: 'Rohit Kapoor', email: 'rohit.owner@rentmaster.com', password: 'owner123',
    role: 'owner', phone: '+91 98300 33333', avatarColor: '#8b5cf6',
  });

  console.log('👥 Users (admin/owners) created');

  /* ---------------- PROPERTIES ---------------- */
  const props = await Property.insertMany([
    {
      name: 'Skyline Residency', type: 'Apartment', owner: owner1._id,
      description: 'Premium 3BHK apartments with clubhouse, gym and rooftop pool in the heart of Bandra.',
      address: { line1: '12 Hill Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
      totalUnits: 48, occupiedUnits: 41, rentAmount: 65000, bedrooms: 3, bathrooms: 3, areaSqft: 1450,
      status: 'Occupied', tags: ['Sea View', 'Gated', 'Power Backup'],
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=70',
    },
    {
      name: 'Green Valley Villas', type: 'Villa', owner: owner1._id,
      description: 'Independent 4BHK villas surrounded by landscaped gardens and private parking.',
      address: { line1: '7 Palm Grove Layout', city: 'Bengaluru', state: 'Karnataka', pincode: '560103' },
      totalUnits: 20, occupiedUnits: 14, rentAmount: 92000, bedrooms: 4, bathrooms: 4, areaSqft: 2600,
      status: 'Available', tags: ['Private Garden', 'Pet Friendly'],
      imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=70',
    },
    {
      name: 'Urban Nest Studios', type: 'Studio', owner: owner2._id,
      description: 'Fully furnished smart studios for working professionals with co-working lounge.',
      address: { line1: '221 Sector 62', city: 'Noida', state: 'Uttar Pradesh', pincode: '201309' },
      totalUnits: 60, occupiedUnits: 52, rentAmount: 24000, bedrooms: 1, bathrooms: 1, areaSqft: 520,
      status: 'Occupied', tags: ['Furnished', 'Metro Nearby', 'WiFi'],
      imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70',
    },
    {
      name: 'Lakeview Heights', type: 'Penthouse', owner: owner2._id,
      description: 'Luxury penthouses overlooking the lake with private terrace and jacuzzi.',
      address: { line1: '5 Lakeview Avenue', city: 'Pune', state: 'Maharashtra', pincode: '411045' },
      totalUnits: 12, occupiedUnits: 6, rentAmount: 150000, bedrooms: 5, bathrooms: 5, areaSqft: 3800,
      status: 'Available', tags: ['Lake View', 'Terrace', 'Concierge'],
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=70',
    },
  ]);
  console.log('🏢 Properties created:', props.length);

  /* ---------------- TENANTS & STAFF ---------------- */
  const tenant1 = await User.create({
    name: 'Sneha Iyer', email: 'tenant@rentmaster.com', password: 'tenant123',
    role: 'tenant', phone: '+91 98400 44444', property: props[0]._id, unitNumber: 'A-1204',
    avatarColor: '#10b981',
  });
  const tenant2 = await User.create({
    name: 'Karan Malhotra', email: 'karan.tenant@rentmaster.com', password: 'tenant123',
    role: 'tenant', phone: '+91 98500 55555', property: props[0]._id, unitNumber: 'B-0703',
    avatarColor: '#f59e0b',
  });
  const tenant3 = await User.create({
    name: 'Ananya Rao', email: 'ananya.tenant@rentmaster.com', password: 'tenant123',
    role: 'tenant', phone: '+91 98600 66666', property: props[2]._id, unitNumber: 'S-311',
    avatarColor: '#ec4899',
  });

  const staff1 = await User.create({
    name: 'Ramesh Yadav', email: 'staff@rentmaster.com', password: 'staff123',
    role: 'staff', phone: '+91 98700 77777', department: 'Plumbing', avatarColor: '#ef4444',
  });
  const staff2 = await User.create({
    name: 'Imran Khan', email: 'imran.staff@rentmaster.com', password: 'staff123',
    role: 'staff', phone: '+91 98800 88888', department: 'Electrical', avatarColor: '#14b8a6',
  });
  console.log('👤 Tenants & staff created');

  /* ---------------- AMENITIES ---------------- */
  const amenities = await Amenity.insertMany([
    {
      name: 'Rooftop Swimming Pool', property: props[0]._id, category: 'Swimming Pool',
      description: 'Temperature-controlled infinity pool with sundeck and lifeguard on duty.',
      location: 'Terrace, Tower A', capacity: 2, openTime: '06:00', closeTime: '21:00',
      slotDurationMins: 60, maxHoursPerBooking: 2, bookingFee: 0, availabilityStatus: 'Available',
      rules: ['Swimming costume mandatory', 'Children under 12 need adult supervision', 'No glass items'],
      imageUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=70',
    },
    {
      name: 'Fitness Centre', property: props[0]._id, category: 'Gym',
      description: 'Fully-equipped gym with cardio zone, free weights and personal trainer support.',
      location: 'Ground Floor, Tower B', capacity: 3, openTime: '05:00', closeTime: '23:00',
      slotDurationMins: 60, maxHoursPerBooking: 2, availabilityStatus: 'Available',
      rules: ['Gym shoes compulsory', 'Wipe equipment after use'],
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=70',
    },
    {
      name: 'Grand Party Hall', property: props[0]._id, category: 'Party Hall',
      description: 'Air-conditioned banquet hall for 120 guests with stage, sound system and pantry.',
      location: 'Clubhouse, 1st Floor', capacity: 1, openTime: '09:00', closeTime: '23:00',
      slotDurationMins: 120, maxHoursPerBooking: 6, bookingFee: 5000, availabilityStatus: 'Available',
      rules: ['Advance booking required', 'No loud music after 10 PM', 'Cleaning charges applicable'],
      imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=70',
    },
    {
      name: 'Tennis Court', property: props[1]._id, category: 'Tennis Court',
      description: 'Synthetic hard court with floodlights for evening play.',
      location: 'Sports Zone', capacity: 2, openTime: '06:00', closeTime: '22:00',
      slotDurationMins: 60, maxHoursPerBooking: 2, availabilityStatus: 'Available',
      rules: ['Non-marking shoes only', 'Bring your own racket'],
      imageUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=70',
    },
    {
      name: 'Co-working Lounge', property: props[2]._id, category: 'Co-working',
      description: 'High-speed WiFi workstations with meeting pod and unlimited coffee.',
      location: 'Block C, Level 2', capacity: 4, openTime: '08:00', closeTime: '22:00',
      slotDurationMins: 60, maxHoursPerBooking: 4, availabilityStatus: 'Available',
      rules: ['Silence zone', 'Meeting pod max 45 mins'],
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=70',
    },
    {
      name: 'Clubhouse Lounge', property: props[3]._id, category: 'Clubhouse',
      description: 'Premium lounge with pool table, library corner and lake-facing balcony.',
      location: 'Podium Level', capacity: 2, openTime: '07:00', closeTime: '22:00',
      slotDurationMins: 60, maxHoursPerBooking: 3, availabilityStatus: 'Under Maintenance',
      rules: ['Formal attire preferred'],
      imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=70',
    },
  ]);
  console.log('🏊 Amenities created:', amenities.length);

  /* ---------------- MAINTENANCE REQUESTS ---------------- */
  const mkTimeline = (steps) => steps;

  const requests = [
    {
      property: props[0]._id, raisedBy: tenant1._id, assignedTo: staff1._id,
      title: 'Kitchen sink pipe leaking continuously',
      description: 'Water is leaking from the pipe under the kitchen sink since morning. Floor is getting wet and there is risk of slipping.',
      category: 'Plumbing', priority: 'High', status: 'In Progress', unitNumber: 'A-1204',
      createdAt: hoursAgo(20),
      timeline: mkTimeline([
        { status: 'Pending', note: 'Request submitted', byName: 'Sneha Iyer', at: hoursAgo(20) },
        { status: 'In Progress', note: 'Plumber assigned and on the way', byName: 'Priya Mehta', at: hoursAgo(14) },
      ]),
      comments: [
        { user: tenant1._id, name: 'Sneha Iyer', role: 'tenant', text: 'Please send someone urgently, water is spreading.', createdAt: hoursAgo(18) },
        { user: staff1._id, name: 'Ramesh Yadav', role: 'staff', text: 'Reaching your unit within 2 hours with replacement pipe.', createdAt: hoursAgo(13) },
      ],
    },
    {
      property: props[0]._id, raisedBy: tenant2._id, assignedTo: staff2._id,
      title: 'Living room lights flickering',
      description: 'All ceiling lights in the living room flicker whenever the AC is switched on. Possible wiring issue.',
      category: 'Electrical', priority: 'Medium', status: 'Completed', unitNumber: 'B-0703',
      createdAt: hoursAgo(60), resolvedAt: hoursAgo(30), rating: 5,
      resolutionNote: 'Loose neutral connection in the distribution box was tightened and tested.',
      timeline: mkTimeline([
        { status: 'Pending', note: 'Request submitted', byName: 'Karan Malhotra', at: hoursAgo(60) },
        { status: 'In Progress', note: 'Electrician inspecting the DB box', byName: 'Imran Khan', at: hoursAgo(45) },
        { status: 'Completed', note: 'Issue resolved and verified', byName: 'Imran Khan', at: hoursAgo(30) },
      ]),
    },
    {
      property: props[0]._id, raisedBy: tenant1._id,
      title: 'Balcony door lock jammed',
      description: 'The sliding balcony door lock is jammed and does not close properly, security concern at night.',
      category: 'Carpentry', priority: 'Urgent', status: 'Pending', unitNumber: 'A-1204',
      createdAt: hoursAgo(3),
      timeline: mkTimeline([{ status: 'Pending', note: 'Request submitted', byName: 'Sneha Iyer', at: hoursAgo(3) }]),
    },
    {
      property: props[2]._id, raisedBy: tenant3._id, assignedTo: staff1._id,
      title: 'Bathroom geyser not heating water',
      description: 'Geyser turns on but water remains cold even after 20 minutes.',
      category: 'Appliance', priority: 'High', status: 'In Progress', unitNumber: 'S-311',
      createdAt: hoursAgo(52),
      timeline: mkTimeline([
        { status: 'Pending', note: 'Request submitted', byName: 'Ananya Rao', at: hoursAgo(52) },
        { status: 'In Progress', note: 'Technician checking heating element', byName: 'Rohit Kapoor', at: hoursAgo(40) },
      ]),
    },
    {
      property: props[2]._id, raisedBy: tenant3._id,
      title: 'Corridor deep cleaning required',
      description: 'Third floor corridor has not been cleaned for a week, dust accumulation near the staircase.',
      category: 'Cleaning', priority: 'Low', status: 'Completed', unitNumber: 'S-311',
      createdAt: hoursAgo(96), resolvedAt: hoursAgo(80), rating: 4,
      resolutionNote: 'Corridor deep cleaned and weekly schedule restored.',
      timeline: mkTimeline([
        { status: 'Pending', note: 'Request submitted', byName: 'Ananya Rao', at: hoursAgo(96) },
        { status: 'Completed', note: 'Housekeeping completed', byName: 'Rohit Kapoor', at: hoursAgo(80) },
      ]),
    },
    {
      property: props[0]._id, raisedBy: tenant2._id,
      title: 'Main gate intercom not working',
      description: 'Intercom from the security gate to flat B-0703 is dead. Visitors cannot be announced.',
      category: 'Security', priority: 'Medium', status: 'Pending', unitNumber: 'B-0703',
      createdAt: hoursAgo(8),
      timeline: mkTimeline([{ status: 'Pending', note: 'Request submitted', byName: 'Karan Malhotra', at: hoursAgo(8) }]),
    },
  ];

  for (const r of requests) {
    const doc = new MaintenanceRequest(r);
    doc.createdAt = r.createdAt;
    await doc.save({ timestamps: false });
  }
  console.log('🔧 Maintenance requests created:', requests.length);

  /* ---------------- AMENITY BOOKINGS ---------------- */
  const today = dayOffset(0);
  const tomorrow = dayOffset(1);
  const yesterday = dayOffset(-1);

  const bookings = [
    {
      amenity: amenities[1]._id, property: props[0]._id, user: tenant1._id,
      bookingDate: today, checkIn: at(today, '07:00'), checkOut: at(today, '08:00'),
      guests: 1, purpose: 'Morning workout', status: 'Completed',
      actualCheckInAt: at(today, '07:02'), actualCheckOutAt: at(today, '08:05'),
    },
    {
      amenity: amenities[0]._id, property: props[0]._id, user: tenant2._id,
      bookingDate: today, checkIn: at(today, '18:00'), checkOut: at(today, '19:00'),
      guests: 2, purpose: 'Evening swim', status: 'Booked',
    },
    {
      amenity: amenities[2]._id, property: props[0]._id, user: tenant1._id,
      bookingDate: tomorrow, checkIn: at(tomorrow, '18:00'), checkOut: at(tomorrow, '22:00'),
      guests: 1, purpose: 'Birthday celebration', status: 'Booked',
    },
    {
      amenity: amenities[4]._id, property: props[2]._id, user: tenant3._id,
      bookingDate: today, checkIn: at(today, '10:00'), checkOut: at(today, '14:00'),
      guests: 1, purpose: 'Client calls & remote work', status: 'CheckedIn',
      actualCheckInAt: at(today, '10:04'),
    },
    {
      amenity: amenities[3]._id, property: props[1]._id, user: tenant2._id,
      bookingDate: yesterday, checkIn: at(yesterday, '17:00'), checkOut: at(yesterday, '18:00'),
      guests: 2, purpose: 'Tennis practice', status: 'Completed',
      actualCheckInAt: at(yesterday, '17:00'), actualCheckOutAt: at(yesterday, '18:00'),
    },
  ];
  await AmenityBooking.insertMany(bookings);
  console.log('📅 Amenity bookings created:', bookings.length);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║            ✅  RENTMASTER SEED COMPLETED                 ║
╠══════════════════════════════════════════════════════════╣
║  ADMIN   → admin@rentmaster.com   / admin123             ║
║  OWNER   → owner@rentmaster.com   / owner123             ║
║  TENANT  → tenant@rentmaster.com  / tenant123            ║
║  STAFF   → staff@rentmaster.com   / staff123             ║
╚══════════════════════════════════════════════════════════╝
`);
};

(async () => {
  try {
    await connectDB();
    if (process.argv.includes('--destroy')) {
      await destroy();
    } else {
      await seed();
    }
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
})();