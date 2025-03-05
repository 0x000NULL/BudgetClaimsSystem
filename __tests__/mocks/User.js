const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin'
};

const findById = jest.fn();

module.exports = {
    findById,
    mockUser
}; 