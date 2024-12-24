const express = require('express');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const methodOverride = require('method-override');
const pinoHttp = require('pino-http');
const pinoLogger = require('./logger');

function createTestServer() {
    try {
        const app = express();

        // Basic middleware
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(cors());
        app.use(fileUpload());
        app.use(methodOverride('_method'));
        
        // Logging
        const logger = pinoHttp({ 
            logger: pinoLogger,
            customLogLevel: (res, err) => {
                if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
                if (res.statusCode >= 500 || err) return 'error';
                return 'info';
            }
        });
        app.use(logger);
        
        // View engine
        app.set('view engine', 'ejs');

        // Security settings
        app.use(helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
            crossOriginResourcePolicy: false,
            crossOriginOpenerPolicy: false
        }));

        // Session configuration
        const sessionConfig = {
            secret: process.env.SESSION_SECRET || 'test-session-secret',
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ 
                mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/test',
                autoRemove: 'native',
                ttl: 24 * 60 * 60 // 1 day
            }),
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            }
        };
        app.use(session(sessionConfig));

        // Authentication
        app.use(passport.initialize());
        app.use(passport.session());
        require('./config/passport')(passport);

        // Flash messages
        app.use(flash());
        app.use((req, res, next) => {
            res.locals.success_msg = req.flash('success_msg');
            res.locals.error_msg = req.flash('error_msg');
            res.locals.error = req.flash('error');
            res.locals.user = req.user;
            next();
        });

        // Static files
        app.use(express.static(path.join(__dirname, 'public')));

        // Routes
        app.use('/', require('./routes/index'));
        app.use('/users', require('./routes/users'));
        app.use('/claims', require('./routes/claims'));
        app.use('/dashboard', require('./routes/dashboard'));
        app.use('/api', require('./routes/api'));
        app.use('/feedback', require('./routes/feedback'));
        app.use('/customers', require('./routes/customers'));
        app.use('/employees', require('./routes/employees'));
        app.use('/email', require('./routes/email'));
        app.use('/reports', require('./routes/reports'));
        app.use('/audit-logs', require('./routes/auditLogs'));
        app.use('/email-templates', require('./routes/emailTemplates'));
        app.use('/export', require('./routes/export'));
        app.use('/import', require('./routes/import'));

        // Error handling
        app.use((err, req, res, next) => {
            pinoLogger.error('Server error:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        });

        // 404 handler
        app.use((req, res) => {
            res.status(404).json({ error: 'Not Found' });
        });

        return app;
    } catch (error) {
        pinoLogger.error('Error creating test server:', error);
        throw error;
    }
}

module.exports = createTestServer; 