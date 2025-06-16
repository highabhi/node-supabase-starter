const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { initializeDatabase } = require('./database/init');

//Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

//Database config with fallback to SQLite
const dbConfig = require('./database/config-fallback');

const app = express();
const PORT = process.env.PORT || 3001


app.use(helmet());

//cors configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
    ? ['https://video.unbrain.io']
        : ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));




//Rate limiting
const limiter =  rateLimit({
    windowMs: 15 * 60 * 1000, //15minutes
    max: 100, //limit on each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after some time'
    }
});

//Login rate limiting
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Too many failed attempts, play try again after some time'
    },
    skipSuccessfulRequests: true
});

app.use(limiter);

//Login
app.use(morgan('combined'));

//Body Parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({  extended: true, limit: '10mb' }));

//Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: `Server is running on Port ${PORT}!`,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// API routes
app.use('/api/auth', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

//Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: `UnBrain.io Streaming API`,
        version: '1.0.0',
        documentation: '/api/docs' //will be adding soon
    });
});

//404 handler
app.use('*', (req, res) => [
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    })
])

//Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler: ', error);
    res.status(error.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
            : error.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
});

//Server initialization
async function startServer() {
    try {
        // Initialize database connection with fallback to SQLite
        const pool = await dbConfig.initializeDatabase();
        
        // Initialize database tables
        await initializeDatabase();

        const dbInfo = dbConfig.getDbInfo();
        console.log(`Connected to ${dbInfo.type} database`);

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}!`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health Check: http://localhost:${PORT}/health`);
            console.log(`API Base URL: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();