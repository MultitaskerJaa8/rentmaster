const fs = require('fs');
const path = require('path');

const files = [
  '.env', 'package.json', 'seed.js', 'vercel.json', 'README.md',
  'client/.env', 'client/index.html', 'client/package.json',
  'client/vite.config.js', 'client/tailwind.config.js', 'client/postcss.config.js',
  'client/src/main.jsx', 'client/src/App.jsx', 'client/src/index.css',
  'client/src/components/common/EmptyState.jsx', 'client/src/components/common/Loader.jsx',
  'client/src/components/layout/Layout.jsx', 'client/src/components/layout/Navbar.jsx', 'client/src/components/layout/Sidebar.jsx',
  'client/src/context/AuthContext.jsx',
  'client/src/hooks/usePoll.js',
  'client/src/pages/auth/LoginPage.jsx', 'client/src/pages/auth/RegisterPage.jsx',
  'client/src/pages/shared/DashboardPage.jsx', 'client/src/pages/shared/PropertiesPage.jsx',
  'client/src/pages/shared/MaintenancePage.jsx', 'client/src/pages/shared/AmenitiesPage.jsx',
  'client/src/pages/shared/UsersPage.jsx',
  'client/src/services/api.js', 'client/src/services/authService.js', 'client/src/services/propertyService.js',
  'client/src/services/maintenanceService.js', 'client/src/services/amenityService.js',
  'client/src/services/dashboardService.js', 'client/src/services/userService.js',
  'client/src/utils/role.js',
  'server/api/index.js', 'server/config/db.js',
  'server/controllers/amenityController.js', 'server/controllers/authController.js',
  'server/controllers/dashboardController.js', 'server/controllers/maintenanceController.js',
  'server/controllers/propertyController.js', 'server/controllers/userController.js',
  'server/middleware/authMiddleware.js', 'server/middleware/errorMiddleware.js', 'server/middleware/roleMiddleware.js',
  'server/models/Amenity.js', 'server/models/AmenityBooking.js', 'server/models/MaintenanceRequest.js',
  'server/models/Property.js', 'server/models/User.js',
  'server/routes/amenityRoutes.js', 'server/routes/authRoutes.js', 'server/routes/dashboardRoutes.js',
  'server/routes/maintenanceRoutes.js', 'server/routes/propertyRoutes.js', 'server/routes/userRoutes.js',
  'server/utils/generateToken.js', 'server/app.js', 'server/server.js',
];

let missing = 0;
console.log('\n🔍 RentMaster File Check\n' + '='.repeat(60));

for (const f of files) {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    const size = fs.statSync(p).size;
    console.log(`✅ ${f}`);
    if (size === 0) { console.log(`   ⚠️  YE FILE KHAALI (0 bytes) HAI!`); missing++; }
  } else {
    missing++;
    console.log(`❌ MISSING: ${f}`);
    const dir = path.dirname(p);
    const base = path.basename(p);
    if (fs.existsSync(dir)) {
      const twin = fs.readdirSync(dir).find((x) => x.toLowerCase().startsWith(base.toLowerCase() + '.'));
      if (twin)
        console.log(`   👉 MILA: "${path.join(path.basename(dir), twin)}" → iska naam badal kar sirf "${base}" karo (DOUBLE EXTENSION problem!)`);
      const wrongCase = fs.readdirSync(dir).find((x) => x.toLowerCase() === base.toLowerCase());
      if (wrongCase && wrongCase !== base)
        console.log(`   👉 MILA: "${wrongCase}" → exact naam "${base}" rakho`);
    }
  }
}

console.log('='.repeat(60));
console.log(
  missing
    ? `🔴 ${missing} file(s) missing/empty — upar wale 👉 hints follow karo.`
    : '🟢 SAB FILES SAHI JAGAH HAIN! Ab STEP 3 karo.'
);