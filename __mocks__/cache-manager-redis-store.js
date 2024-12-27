module.exports = {
    redisStore: jest.fn().mockReturnValue({
        name: 'redis',
        getClient: jest.fn().mockReturnValue({
            on: jest.fn(),
            connect: jest.fn()
        })
    })
}; 