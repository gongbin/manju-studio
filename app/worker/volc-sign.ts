// Volcengine API v4 (HMAC-SHA256) request signing for the control-plane (CV
// MediaKit) — ports seedance-app's sign_request to Web Crypto. service=cv.
const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');

async function sha256hex(s: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))));
}
async function hmac(keyBytes: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function signCv(ak: string, sk: string, method: string, uri: string, params: Record<string, string>, body: string): Promise<Record<string, string>> {
  const service = 'cv';
  const region = 'cn-beijing';
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); // YYYYMMDDTHHMMSSZ
  const date = ts.slice(0, 8);

  const canonicalHeaders = `host:cv.volcengineapi.com\nx-date:${ts}\n`;
  const signedHeaders = 'host;x-date';
  const queryString = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  const canonicalRequest = `${method}\n${uri}\n${queryString}\n${canonicalHeaders}\n${signedHeaders}\n${await sha256hex(body)}`;

  const credentialScope = `${date}/${region}/${service}/request`;
  const stringToSign = `HMAC-SHA256\n${ts}\n${credentialScope}\n${await sha256hex(canonicalRequest)}`;

  const kDate = await hmac(enc.encode(`VOLC${sk}`), date);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'request');
  const signature = hex(await hmac(kSigning, stringToSign));

  return {
    Authorization: `HMAC-SHA256 Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'X-Date': ts,
  };
}
