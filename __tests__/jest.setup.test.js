const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('MongoDB In-Memory Server', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  it('should start MongoDB in-memory server', async () => {
    expect(mongoServer).toBeDefined();
    expect(mongoServer.getUri()).toContain('mongodb://');
  });

  it('should connect to MongoDB', async () => {
    const connectionState = mongoose.connection.readyState;
    expect(connectionState).toBe(1); // 1 means connected
  });

  it('should clear collections after each test', async () => {
    const testSchema = new mongoose.Schema({ name: String });
    const TestModel = mongoose.model('Test', testSchema);

    await TestModel.create({ name: 'test' });
    let count = await TestModel.countDocuments();
    expect(count).toBe(1);

    await TestModel.deleteMany({});
    count = await TestModel.countDocuments();
    expect(count).toBe(0);
  });
});