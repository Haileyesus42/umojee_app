import { Request, Response } from 'express';
import { processBooking } from './processBooking';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const webhookHandler = async (request: Request, response: Response) => {
  let event: any;
  let data: any;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (endpointSecret) {
    const sig = request.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
      if (event.type === 'checkout.session.completed') {
        data = event.data.object;
        try {
          console.log('1. WEBHOOK HANDLER: Now we are going to process booking and commit transaction!!!');
          await processBooking(data)
          response.status(200).send();
          console.log('6. WEBHOOK HANDLER: Checkout was successful!!!');
        }
        catch (err: any) {
          console.error('Error handling checkout.session.completed:', err);
          return response.status(500).send('Error processing booking');
        }
      }
      else {
        console.log(`Unhandled event type ${event.type}`);
      }
    } catch (err: any) {
      console.error('⚠️  Webhook signature verification failed.', err.message);
      return response.sendStatus(400)
    }
  }
};
export default webhookHandler;