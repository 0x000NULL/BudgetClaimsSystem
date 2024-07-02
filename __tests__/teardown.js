const mongoose = require('mongoose');

module.exports = async () => {
  await mongoose.disconnect();
  if (global.mongoServer) {
    await global.mongoServer.stop();
  }
};
