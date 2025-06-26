// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { privacyPolicyRouter } from './routes/privacy-policy.js';
import { errorHandler } from './middleware/error-handler.js';
import hibpRoutes from './routes/hibp';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
}));

// CORS configuration for Chrome extension
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow Chrome extension origins and localhost
    if (!origin || 
        origin.startsWith('chrome-extension://') || 
        origin.startsWith('moz-extension://') ||
        origin.includes('localhost') ||
        process.env.ALLOWED_ORIGINS?.split(',').some(allowedOrigin => 
          origin.includes(allowedOrigin.trim())
        )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Debug endpoint to list available routes
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'Kavach Privacy Guardian API',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'POST /api/privacy-policy/analyze': 'Analyze privacy policy',
      'GET /api/privacy-policy/find': 'Find privacy policy URL'
    },
    timestamp: new Date().toISOString()
  });
});

// API routes
console.log('🔗 Registering API routes...');
app.use('/api/privacy-policy', privacyPolicyRouter);
app.use('/api/hibp', hibpRoutes);
console.log('✅ Privacy policy routes registered');

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested resource does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Kavach Backend Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS enabled for Chrome extensions`);
});

export default app;
