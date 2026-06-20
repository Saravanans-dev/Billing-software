import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import pool, { runMigrations } from './config/database';

import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import saleRoutes from './routes/sales';
import purchaseRoutes from './routes/purchases';
import supplierRoutes from './routes/suppliers';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import exportRoutes from './routes/exports';
import settingsRoutes from './routes/settings';
import uploadRoutes from './routes/upload';
import invoiceRoutes from './routes/invoice';
import paymentRoutes from './routes/payments';
import { sanitizeInput } from './middleware/sanitize';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin.split(',').map(s => s.trim()), credentials: true }));
} else if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: '*', credentials: true }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Input sanitization
app.use('/api/', sanitizeInput);

// Static files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/payments', paymentRoutes);

// Root redirect
app.get('/', (_req, res) => {
  res.redirect('/api/health');
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});



// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`Student Xerox Billing API running on port ${PORT}`);
  try {
    await runMigrations();
      await pool.query(
        `UPDATE company_settings SET address=$1, mobile=$2 WHERE address IS NULL OR mobile IS NULL`,
        ['Therikiyur, Ayyampalayam, Trichy - 621005', '9876543210']
      );
      await pool.query(
        `UPDATE company_settings SET logo_url='/uploads/logo.jpeg' WHERE logo_url IS NULL`
      );

      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const logoDest = path.join(uploadsDir, 'logo.jpeg');
      if (!fs.existsSync(logoDest)) {
        const logoSrc = path.join(__dirname, '../assets/logo.jpeg');
        if (fs.existsSync(logoSrc)) {
          fs.copyFileSync(logoSrc, logoDest);
          console.log('Logo copied to uploads');
        }
      }
  } catch (err) {
    console.error('Startup task failed, server still running:', err);
  }
});

export default app;
