const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () =>
      console.log(
        `\n🚀 RentMaster API running → http://localhost:${PORT}/api/health  [${process.env.NODE_ENV}]\n`
      )
    );
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});