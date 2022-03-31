/**
 * Translates a base64 string into a string that is safe for HTTP headers.
 * In particular, it strips any trailing equals signs, which only serve as
 * padding, and it changes all slashes ('/') to dashes ('-').
 *
 * @param base64 Base64 string to make safe for HTTP headers
 * @return Returns an HTTP header-safe version of the string
 */
export function toHeaderSafeBase64(base64: string): string {
  return base64.replace(/\=+$/, '').replace(/\//g, '-');
}
