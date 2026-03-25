/**
 * Vercel Speed Insights initialization
 * 
 * This module initializes Vercel Speed Insights for performance monitoring.
 * It automatically tracks Core Web Vitals and other performance metrics.
 */

// Import the injectSpeedInsights function from the CDN
import { injectSpeedInsights } from 'https://cdn.jsdelivr.net/npm/@vercel/speed-insights@2.0.0/dist/index.mjs';

// Initialize Speed Insights
// This will automatically track performance metrics when deployed to Vercel
injectSpeedInsights();
