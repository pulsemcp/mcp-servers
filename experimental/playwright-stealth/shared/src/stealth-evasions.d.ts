/**
 * Type declarations for puppeteer-extra-plugin-stealth evasion modules
 */

declare module 'puppeteer-extra-plugin-stealth/evasions/user-agent-override/index.js' {
  interface UserAgentOverrideOptions {
    /** Custom user agent string (default: browser.userAgent()) */
    userAgent?: string;
    /** Locale for Accept-Language header (default: 'en-US,en') */
    locale?: string;
    /** Whether to mask Linux platform as Windows (default: true) */
    maskLinux?: boolean;
  }

  function UserAgentOverridePlugin(
    opts?: UserAgentOverrideOptions
  ): import('puppeteer-extra-plugin').PuppeteerExtraPlugin;

  export default UserAgentOverridePlugin;
}
