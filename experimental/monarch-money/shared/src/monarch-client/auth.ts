/**
 * REST login flow for Monarch Money.
 *
 * Monarch's login is a plain JSON POST to `/auth/login/`. The GraphQL endpoint
 * does not expose a `login` mutation — it requires an existing session token —
 * so password/TOTP exchange happens here.
 *
 * Monarch challenges first-time logins from a new device with an email OTP:
 * the API returns 403 with `error_code: "EMAIL_OTP_REQUIRED"`, sends a code to
 * the user's email, and expects the same request again with `email_otp` set.
 * The `device-uuid` header pins a stable identifier to that pairing — once
 * accepted, subsequent password logins from the same uuid skip the OTP gate.
 */
import { randomUUID } from 'crypto';

const DEFAULT_LOGIN_ENDPOINT = 'https://api.monarch.com/auth/login/';

export interface LoginInput {
  email: string;
  password: string;
  /** TOTP code for accounts with 2FA enabled. */
  totp?: string;
  /** Email OTP code (set after the first attempt returns EMAIL_OTP_REQUIRED). */
  emailOtp?: string;
  /**
   * Stable per-install identifier sent in the `device-uuid` header. Persist this
   * across runs — Monarch trusts the device-uuid + IP combination after one
   * successful pairing, so subsequent logins skip the email OTP challenge.
   */
  deviceUuid: string;
}

export interface LoginResult {
  token: string;
  user?: { id?: string; email?: string; name?: string } | null;
}

export class MonarchEmailOtpRequiredError extends Error {
  constructor(message = 'Monarch requires an email OTP to continue login.') {
    super(message);
    this.name = 'MonarchEmailOtpRequiredError';
  }
}

export class MonarchTotpRequiredError extends Error {
  constructor(message = 'Monarch requires a TOTP code to continue login.') {
    super(message);
    this.name = 'MonarchTotpRequiredError';
  }
}

export class MonarchLoginRejectedError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'MonarchLoginRejectedError';
  }
}

export interface LoginTransportOptions {
  /** Override the login endpoint (used by tests). */
  endpoint?: string;
  /** Override fetch (used by tests). */
  fetchImpl?: typeof fetch;
}

export function generateDeviceUuid(): string {
  return randomUUID();
}

/**
 * Exchange email + password (and optional MFA codes) for a session token.
 *
 * Throws one of the typed errors below on a non-token outcome. Callers that
 * encounter `MonarchEmailOtpRequiredError` should re-prompt the user for the
 * code Monarch just emailed and retry with `emailOtp` set.
 */
export async function login(
  input: LoginInput,
  opts: LoginTransportOptions = {}
): Promise<LoginResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const endpoint = opts.endpoint ?? DEFAULT_LOGIN_ENDPOINT;

  const body: Record<string, unknown> = {
    username: input.email,
    password: input.password,
    trusted_device: true,
    supports_mfa: true,
    supports_email_otp: true,
    supports_recaptcha: true,
  };
  if (input.totp) body.totp = input.totp;
  if (input.emailOtp) body.email_otp = input.emailOtp;

  let res: Response;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://app.monarch.com',
        Referer: 'https://app.monarch.com/',
        'client-platform': 'web',
        'device-uuid': input.deviceUuid,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `Monarch login network error: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err }
    );
  }

  const text = await res.text();
  let parsed: {
    token?: string;
    detail?: string;
    error_code?: string;
    user?: unknown;
  } | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (e.g., HTML error page). Fall through to status mapping.
  }

  if (res.ok && parsed?.token) {
    return {
      token: parsed.token,
      user: (parsed.user ?? null) as LoginResult['user'],
    };
  }

  const code = parsed?.error_code ?? '';
  const detail = parsed?.detail ?? `${res.status} ${res.statusText}`;

  // Prefer the structured error_code over substring-matching `detail` — the
  // detail string is human-prose that has changed in the past and is shared
  // between MFA modes (e.g. a generic "MFA required" could be either OTP
  // type). We only fall back to detail-matching when no error_code is set.
  if (code === 'EMAIL_OTP_REQUIRED') {
    throw new MonarchEmailOtpRequiredError(detail);
  }
  if (code === 'TOTP_REQUIRED') {
    throw new MonarchTotpRequiredError(detail);
  }
  if (!code && /email.*otp/i.test(detail)) {
    throw new MonarchEmailOtpRequiredError(detail);
  }
  if (!code && /\btotp\b|two[- ]factor/i.test(detail)) {
    throw new MonarchTotpRequiredError(detail);
  }

  throw new MonarchLoginRejectedError(res.status, detail);
}
