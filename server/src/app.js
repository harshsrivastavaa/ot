const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { clientOrigin } = require('./config/env');
const apiRoutes = require('./routes');
const { errorHandler, AppError } = require('./utils/errors');

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: clientOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
);
app.get('/api/health', (req, res) => res.json({ data: { status: 'ok' } }));
app.use('/api', apiRoutes);
app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found.')));
app.use(errorHandler);
module.exports = app;
