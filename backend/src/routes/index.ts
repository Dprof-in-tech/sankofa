import { Router } from 'express';
import * as demo from '../controllers/demo.controller.js';
import * as theft from '../controllers/theft.controller.js';
import * as webhook from '../controllers/webhook.controller.js';

export const router: Router = Router();

// Theft lifecycle
router.post('/theft/trigger', theft.triggerTheft);
router.get('/theft/:id/resolve', theft.resolveEvent);
router.get('/events', theft.listEvents);
router.get('/activity', theft.listActivity);
router.get('/devices/:id', theft.getDevice);

// Demo controls
router.get('/demo/state', demo.demoState);
router.post('/demo/reset', demo.resetDemo);

// Partner webhooks (inbound)
router.post('/hooks/sale-initiated', webhook.saleInitiated);

// Mock bank (for demo — stands in for Opay/M-Pesa/MoMo)
router.post('/mock-bank/freeze', webhook.mockBankFreeze);
