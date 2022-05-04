
import { setup, defaultClient } from 'applicationinsights';
import { getFlag } from '../flags';

export function initAnalytics() {
  try {
    // check flag first
    if (getFlag("analytics") === true) {
      setup().start();
    }
  }
  catch (err) {
    console.error("Error initializing analytics", err);
    throw new Error(`Error initializing analytics: ${err}`);
  }
}

export function getAnalyticsClient() {
  return defaultClient;
}

// function to trackEvent
export function trackEvent(name: string, properties: any) {
  try {
    if (getFlag("analytics") === true) {
      defaultClient.trackEvent({ 
        name,  
        properties
      });
    }
  }
  catch (err) {
    console.error("Error tracking event", err);
    throw new Error(`Error tracking event: ${err}`);
  }
}