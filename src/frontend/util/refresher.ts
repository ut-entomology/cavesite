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
  // Handler to refresh a session, returning the new expiration in Unix
  // epoch milliseconds. The handler does not need to call setExpiration().
  // Returns 0 if the refresh fails, and onExpiration() will get called.
  onRefresh: () => Promise<number>;
  // Handler to display a message that a session is about to expire.
  // The caller is responsible for refreshing the session and for
  // calling setExpiration() to report the new expiration.
  onWarning: () => void;
  // Handler to implement logout at session expiration.
  onExpiration: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let halfRefreshMillis: number;
let expirationTime = 0; // 0 => not logged in
let wasActive = false;
let config: RefresherOptions;

/**
 * Initializes and starts session refreshing.
 */
export function initRefresher(options: RefresherOptions): void {
  config = Object.assign({}, options);
  halfRefreshMillis = Math.ceil(config.refreshMillis / 2);
  document.onkeydown = markActive;
  document.onscroll = markActive;
  document.onmousedown = markActive;
  document.onresize = markActive;
}

/**
 * Reports the initial session expiration, reports the new timeout when
 * the user opts to extend a session after receiving a timeout warning,
 * and reports that the user has intentionally logged out. There is no
 * need to call this function for automatic refreshes or logouts.
 *
 * @param expiration Date/time of session expiration in Unix epoch
 *    milliseconds, or 0 to report that the user has intentionally logged
 *    out; setting to 0 will not result in a call to onExpiration().
 */
export function setExpiration(expiration: number): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  expirationTime = expiration;
  if (expiration > 0) {
    // Because setExpiration() is called quickly after each new expiration
    // is assigned, extraTime will be slightly less than halfRefreshMillis,
    // making their sum approximately refreshMillis.
    const now = new Date().getTime();
    const extraTime = (expirationTime - now) % halfRefreshMillis;
    // Synchronize refreshes with session so that last of session times
    // out at about time that session would time out.
    scheduleRefresh(halfRefreshMillis + extraTime);
  }
  wasActive = false;
}

function markActive() {
  wasActive = true;
}

function scheduleRefresh(nextRefreshMillis: number) {
  timer = setTimeout(async () => {
    timer = null;
    if (expirationTime > 0) {
      if (wasActive) {
        const newExpiration = await config.onRefresh();
        setExpiration(newExpiration);
        if (newExpiration == 0) {
          config.onExpiration();
        }
        wasActive = false;
      } else {
        const remainingTime = expirationTime - new Date().getTime();
        if (remainingTime <= 0) {
          setExpiration(0);
          config.onExpiration();
        } else if (remainingTime <= config.refreshMillis) {
          scheduleRefresh(remainingTime);
          config.onWarning();
        } else {
          scheduleRefresh(config.refreshMillis);
        }
      }
    }
  }, nextRefreshMillis);
}
