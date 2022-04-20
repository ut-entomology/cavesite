/**
 * Utility for managing session timeouts on the client. The server controls
 * session duration, while the client periodically refreshes the session,
 * reports when the session is about to timeout, and redirects on timeout.
 * This utility implements the periodic refreshing and calls to handlers
 * for timeout warning and logout.
 */

export interface RefresherOptions {
  // Interval at which to refresh sessions.
  refreshMillis: number;
  // Handler to refresh a session, returning the new expiration. The
  // handler does not need to call setExpiration(). Return null if the
  // refresh fails, and onExpiration() will get called.
  onRefresh: () => Promise<Date | null>;
  // Handler to display a message that a session is about to expire.
  // The caller is responsible for refreshing the session and for
  // calling setExpiration() to report the new expiration.
  onWarning: () => void;
  // Handler to implement logout at session expiration.
  onExpiration: () => void;
}

let expirationTime = 0; // 0 => not logged in
let wasActive = false;
let config: RefresherOptions;

/**
 * Initializes and starts session refreshing.
 */
export function initRefresher(options: RefresherOptions): void {
  config = Object.assign({}, options);
  document.onkeydown = markActive;
  document.onscroll = markActive;
  document.onmousedown = markActive;
  document.onresize = markActive;
  scheduleRefresh();
}

/**
 * Reports the initial session expiration, reports the new timeout when
 * the user opts to extend a session after receiving a timeout warning,
 * and reports that the user has intentionally logged out. There is no
 * need to call this function for automatic refreshes or logouts.
 *
 * @param expiration Date/time of session expiration, or null to report
 *    that the user has intentionally logged out and the session is invalid;
 *    setting to null will not result in a call to onExpiration().
 */
export function setExpiration(expiration: Date | null): void {
  console.log('**** set expiration to', expiration);
  expirationTime = expiration?.getTime() || 0;
}

function markActive() {
  wasActive = true;
}

function scheduleRefresh() {
  setTimeout(async () => {
    console.log('**** refresh timeout: expirationTime', expirationTime);
    if (expirationTime > 0) {
      if (wasActive) {
        const newExpiration = await config.onRefresh();
        if (!newExpiration) {
          setExpiration(null);
          config.onExpiration();
        } else {
          setExpiration(newExpiration);
        }
      } else {
        const remainingTime = expirationTime - new Date().getTime();
        if (remainingTime <= 0) {
          setExpiration(null);
          config.onExpiration();
        } else if (remainingTime <= config.refreshMillis) {
          config.onWarning();
        }
      }
    }
    wasActive = false;
    scheduleRefresh();
  }, config.refreshMillis);
}
