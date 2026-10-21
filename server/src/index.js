const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri } = require('./config/env');

async function start() {
  await mongoose.connect(mongoUri);
  app.listen(port, () => console.log(`OT Hub API listening on port ${port}`));
}

start().catch((error) => {
  console.error('Could not start OT Hub API:', error.message);
  process.exit(1);
});
