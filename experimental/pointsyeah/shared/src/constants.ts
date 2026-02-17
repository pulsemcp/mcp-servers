/**
 * PointsYeah Cognito configuration.
 * These are public values from the PointsYeah web app.
 */
export const COGNITO_USER_POOL_REGION = 'us-east-1';
export const COGNITO_CLIENT_ID = '3im8jrentts1pguuouv5s57gfu';
export const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_USER_POOL_REGION}.amazonaws.com/`;

/**
 * PointsYeah API base URL.
 */
export const API2_BASE = 'https://api2.pointsyeah.com';

/**
 * Default fetch timeout in milliseconds.
 */
export const FETCH_TIMEOUT_MS = 30_000;
