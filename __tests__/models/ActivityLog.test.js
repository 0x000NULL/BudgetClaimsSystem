const mongoose = require('mongoose');
const ActivityLog = require('../../models/ActivityLog');

describe('ActivityLog Model Test Suite', () => {
    describe('Validation Tests', () => {
        test('should create a valid activity log', async () => {
            const activityLog = new ActivityLog({
                user: 'user123',
                action: 'login'
            });

            const savedLog = await activityLog.save();
            expect(savedLog._id).toBeDefined();
            expect(savedLog.user).toBe('user123');
            expect(savedLog.action).toBe('login');
            expect(savedLog.timestamp).toBeDefined();
            expect(savedLog.timestamp instanceof Date).toBeTruthy();
        });

        test('should fail without required user field', async () => {
            const activityLog = new ActivityLog({
                action: 'login'
            });

            await expect(activityLog.validate()).rejects.toThrow();
        });

        test('should fail without required action field', async () => {
            const activityLog = new ActivityLog({
                user: 'user123'
            });

            await expect(activityLog.validate()).rejects.toThrow();
        });

        test('should set default timestamp if not provided', async () => {
            const beforeSave = new Date();
            const activityLog = new ActivityLog({
                user: 'user123',
                action: 'login'
            });

            const savedLog = await activityLog.save();
            expect(savedLog.timestamp).toBeDefined();
            expect(savedLog.timestamp instanceof Date).toBeTruthy();
            expect(savedLog.timestamp.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
        });

        test('should accept custom timestamp if provided', async () => {
            const customDate = new Date('2024-01-01');
            const activityLog = new ActivityLog({
                user: 'user123',
                action: 'login',
                timestamp: customDate
            });

            const savedLog = await activityLog.save();
            expect(savedLog.timestamp.getTime()).toBe(customDate.getTime());
        });
    });

    describe('Query Tests', () => {
        beforeEach(async () => {
            await ActivityLog.create([
                { user: 'user123', action: 'login', timestamp: new Date('2024-01-01') },
                { user: 'user123', action: 'logout', timestamp: new Date('2024-12-31') },
                { user: 'user456', action: 'login', timestamp: new Date('2024-06-15') }
            ]);
        });

        test('should successfully find activity logs by user', async () => {
            const logs = await ActivityLog.find({ user: 'user123' });
            expect(logs.length).toBe(2);
            expect(logs[0].user).toBe('user123');
            expect(logs[1].user).toBe('user123');
        });

        test('should successfully find activity logs by action', async () => {
            const logs = await ActivityLog.find({ action: 'login' });
            expect(logs.length).toBe(2);
            logs.forEach(log => {
                expect(log.action).toBe('login');
            });
        });

        test('should successfully find activity logs by timestamp range', async () => {
            const logs = await ActivityLog.find({
                timestamp: { 
                    $gte: new Date('2024-01-01'),
                    $lte: new Date('2024-12-31')
                }
            }).sort({ timestamp: 1 });

            expect(logs.length).toBe(3);
            expect(logs[0].timestamp.getTime()).toBe(new Date('2024-01-01').getTime());
            expect(logs[2].timestamp.getTime()).toBe(new Date('2024-12-31').getTime());
        });

        test('should return empty array when no logs match criteria', async () => {
            const logs = await ActivityLog.find({ user: 'nonexistent' });
            expect(logs).toHaveLength(0);
        });
    });
}); 