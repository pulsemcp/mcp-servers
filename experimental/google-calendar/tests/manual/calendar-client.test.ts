import { describe, it, expect, beforeAll } from 'vitest';
import { ServiceAccountCalendarClient } from '../../shared/src/server.js';
import type { ICalendarClient, ServiceAccountCredentials } from '../../shared/src/server.js';

describe('Google Calendar Client - Manual Tests', () => {
  let client: ICalendarClient;

  beforeAll(() => {
    const clientEmail = process.env.GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL;
    const privateKey = process.env.GCAL_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const impersonateEmail = process.env.GCAL_IMPERSONATE_EMAIL;

    if (!clientEmail || !privateKey || !impersonateEmail) {
      throw new Error(
        'Google Calendar authentication not configured. Set GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL, ' +
          'GCAL_SERVICE_ACCOUNT_PRIVATE_KEY, and GCAL_IMPERSONATE_EMAIL in .env file.'
      );
    }

    const credentials: ServiceAccountCredentials = {
      type: 'service_account',
      project_id: '',
      private_key_id: '',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: '',
    };

    client = new ServiceAccountCalendarClient(credentials, impersonateEmail);
  });

  it('should list calendars', async () => {
    const result = await client.listCalendars({ maxResults: 10 });

    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
    console.log(`Found ${result.items.length} calendar(s)`);
  });

  it('should list events from primary calendar', async () => {
    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await client.listEvents('primary', {
      timeMin: now.toISOString(),
      timeMax: oneMonthFromNow.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    console.log(`Found ${result.items?.length || 0} event(s)`);

    if (result.items && result.items.length > 0) {
      const firstEvent = result.items[0];
      console.log(`First event: ${firstEvent.summary}`);
      expect(firstEvent.id).toBeDefined();
    }
  });

  it('should get a specific event', async () => {
    // First list events to get an event ID
    const listResult = await client.listEvents('primary', {
      maxResults: 1,
      singleEvents: true,
    });

    if (!listResult.items || listResult.items.length === 0) {
      console.log('No events available to test with');
      return;
    }

    const eventId = listResult.items[0].id;
    const event = await client.getEvent('primary', eventId);

    expect(event).toBeDefined();
    expect(event.id).toBe(eventId);
    expect(event.summary).toBeDefined();
    console.log(`Retrieved event: ${event.summary}`);
  });

  it('should query freebusy information', async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await client.queryFreebusy({
      timeMin: now.toISOString(),
      timeMax: tomorrow.toISOString(),
      items: [{ id: 'primary' }],
    });

    expect(result).toBeDefined();
    expect(result.calendars).toBeDefined();
    expect(result.calendars.primary).toBeDefined();
    console.log(`Busy periods: ${result.calendars.primary.busy?.length || 0}`);
  });
});
