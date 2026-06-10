// Import dependencies
require('dotenv').config();
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cron from 'node-cron';
import connectDB from './db/connect';
import AdminRouter from './routes/admin/adminroute';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { globalErrorHandler } from './controller/errorController';
import path from 'path';
import ClientRouter from './routes/client/route';
import webhookHandler from './Handler/webhookHandler';
import { logger } from './middleware/logger';
import errorHandler from './middleware/errorHandler';
import corsOptions from './config/corsOptions';
import Contact, { IContact } from './model/client/contacts';
import { AdminProtect } from './controller/admin/authController';
import AgencyUserRouter from './routes/agency/agencyUser.router';
import { aiRouter } from './routes/AI_Bot/AI.router';
import { amadeusRouter } from './routes/AI_Bot/amadeus.router';
import aiProxy from './middleware/aiProxy';
import weatherRouter from './routes/weather.routes';
import os from 'os';
import { URL } from 'url';
import { pollFlightStatuses } from './services/flightPolling.service';
import { autoCloseInactiveTickets } from './services/supportTicket.service';

export const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Initialize the Express app
const app = express();

// Logger
app.use(logger);

// Enable CORS early so static assets also include CORS headers
app.use(cors());

//
app.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'uploads' folder
app.use('/api/admin/me/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/client/uploads', express.static(path.join(__dirname, 'clientsUploads')));

// CORS is already enabled above

// Set security HTTP headers
app.use(helmet());

// Health check API
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiter: 100 requests per hour
// if (process.env.MAX_REQUESTS_PER_HOUR) {
//   const limiter = rateLimit({
//     max: parseInt(process.env.MAX_REQUESTS_PER_HOUR),
//     windowMs: 60 * 60 * 1000,
//     message: "Too many requests from this IP, please try again in an hour!",
//   });
//   app.use("/api", limiter);
// }

// Body parser - placing this higher to ensure it applies to all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Server-side reverse geocoding via Google Maps Geocoding API.
app.get('/api/location/reverse', async (req: Request, res: Response) => {
  const lat = typeof req.query.lat === 'string' ? parseFloat(req.query.lat) : NaN;
  const lon = typeof req.query.lon === 'string' ? parseFloat(req.query.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat and lon query parameters are required.' });
  }

  const fallbackPayload = {
    city: null,
    address: null,
    display_name: null,
    bounding_box: null,
    lat,
    lon,
  };

  const gmKey = process.env.GOOGLE_MAPS_API_KEY || '';
  if (!gmKey) {
    return res.status(200).json({
      ...fallbackPayload,
      warning: 'GOOGLE_MAPS_API_KEY not configured on server.',
    });
  }
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lon}`);
    url.searchParams.set('language', 'en');
    url.searchParams.set('key', gmKey);

    const upstream = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '');
      return res.status(200).json({
        ...fallbackPayload,
        warning: 'Reverse geocoding failed.',
        details: body.slice(0, 400),
      });
    }

    const data: any = await upstream.json().catch(() => null);
    if (!data || data.status !== 'OK' || !data.results?.length) {
      return res.status(200).json({
        ...fallbackPayload,
        warning: data?.error_message || 'No results for these coordinates.',
      });
    }

    // Extract city and address components from the first result
    const result = data.results[0];
    const components: any[] = result.address_components || [];
    const findComponent = (...types: string[]) =>
      components.find((c: any) => types.some((t) => c.types?.includes(t)))?.long_name || null;

    const city =
      findComponent('locality') ||
      findComponent('administrative_area_level_2') ||
      findComponent('sublocality') ||
      null;

    const address: Record<string, string | null> = {
      city,
      state: findComponent('administrative_area_level_1'),
      country: findComponent('country'),
      postcode: findComponent('postal_code'),
      road: findComponent('route'),
      suburb: findComponent('sublocality', 'neighborhood'),
    };

    const viewport = result.geometry?.viewport;
    const bounding_box = viewport
      ? [
          viewport.southwest?.lat?.toString(),
          viewport.northeast?.lat?.toString(),
          viewport.southwest?.lng?.toString(),
          viewport.northeast?.lng?.toString(),
        ]
      : null;

    return res.json({
      city,
      address,
      display_name: result.formatted_address || null,
      bounding_box,
      lat,
      lon,
    });
  } catch (err) {
    console.error('Reverse geocode error', err);
    return res.status(500).json({ error: 'Unable to reverse geocode location.' });
  }
});

// Contact Us API
app.post('/api/contact', async (req: Request, res: Response) => {
  const { fullName, email, message } = req.body;

  if (!fullName || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const newContact: IContact = new Contact({ fullName, email, message });
    await newContact.save();
    res.status(200).json({ success: 'Message sent and saved successfully' });
    console.log('Successfully saved to the database');
  } catch (error) {
    res.status(500).json({ error: 'Failed to save message' });
    console.log('Not saved to the database');
  }
});

// Prevent parameter pollution
app.use(hpp());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

app.use(compression());

// Connect to database
connectDB();

// cron.schedule('*/3 * * * *', () => {
//   pollFlightStatuses().catch(err => console.error(err));
// });

// Routes
// Proxy AI model endpoints to the FastAPI service to keep single origin
app.use('/api/ai', aiProxy);
app.use('/api/weather', weatherRouter);
app.use('/api/client', ClientRouter);
app.use('/api/admin', AdminRouter);
app.use('/api/agency', AgencyUserRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai/amadeus', amadeusRouter);

app.all('*', (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handling
app.use(globalErrorHandler);

// Error Logger
app.use(errorHandler);

// Cron job to auto-close inactive support tickets
cron.schedule('0 0 * * *', async () => { // Run daily at midnight
  try {
    const inactiveDays = Math.max(
      1,
      parseInt(process.env.SUPPORT_AUTO_CLOSE_DAYS || '7', 10),
    );
    const closedCount = await autoCloseInactiveTickets(inactiveDays);

    console.log(`Auto-closed ${closedCount} inactive support tickets`);
  } catch (error) {
    console.error('Error in auto-close cron job:', error);
  }
});

// Export the app
export default app;
