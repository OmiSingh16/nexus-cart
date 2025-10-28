import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: "nexus-ecommerce",
  eventKey: process.env.INGEST_EVENT_KEY,      
  signingKey: process.env.INGEST_SIGNING_KEY,  
});
