import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const JSON_HEADERS = { "Content-Type": "application/json" };

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;


    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with settings
    const { data: allSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, notify_days_before");

    if (settingsError) throw settingsError;

    let totalSent = 0;

    for (const settings of allSettings || []) {
      const thresholdDate = new Date(
        Date.now() + settings.notify_days_before * 86400000
      ).toISOString().split("T")[0];

      // Find items expiring soon
      const { data: expiringItems } = await supabase
        .from("food_items")
        .select("name, expiry_date")
        .eq("user_id", settings.user_id)
        .eq("status", "active")
        .lte("expiry_date", thresholdDate)
        .order("expiry_date", { ascending: true });

      if (!expiringItems || expiringItems.length === 0) continue;

      // Get push subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", settings.user_id);

      if (!subscriptions || subscriptions.length === 0) continue;

      const itemNames = expiringItems.slice(0, 3).map((i) => i.name).join(", ");
      const body =
        expiringItems.length <= 3
          ? `${itemNames} expiring soon!`
          : `${itemNames} and ${expiringItems.length - 3} more expiring soon!`;

      const payload = JSON.stringify({
        title: "🧊 FridgeKeeper Alert",
        body,
        tag: "expiry-alert",
        url: "/",
      });

      for (const sub of subscriptions) {
        try {
          await sendWebPush(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
          );
          totalSent++;
        } catch (pushErr: any) {
          console.error("Push failed for endpoint:", sub.endpoint, pushErr.message);
          // Remove invalid subscriptions (410 Gone, 404 Not Found)
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }
      }
    }

    console.log(`Sent ${totalSent} notifications`);

    return new Response(
      JSON.stringify({ success: true, notifications_sent: totalSent }),
      { headers: JSON_HEADERS }
    );
  } catch (e) {
    console.error("check-expiry-notifications error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
});

// ---- Web Push implementation using Web Crypto APIs (Deno-compatible) ----

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  const vapidHeaders = await createVapidHeaders(
    subscription.endpoint,
    vapidPublicKey,
    vapidPrivateKey
  );

  const encrypted = await encryptPayload(
    payload,
    subscription.keys.p256dh,
    subscription.keys.auth
  );

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      ...vapidHeaders,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
    },
    body: encrypted,
  });

  if (!response.ok) {
    const text = await response.text();
    const err: any = new Error(`Push failed: ${response.status} ${text}`);
    err.statusCode = response.status;
    throw err;
  }
  await response.text(); // consume body
}

async function createVapidHeaders(
  endpoint: string,
  publicKey: string,
  privateKey: string
) {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: "JWT", alg: "ES256" };
  const claims = { aud: audience, exp: expiration, sub: "mailto:noreply@fridgekeeper.app" };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const claimsB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  const key = await importVapidPrivateKey(publicKey, privateKey);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const rawSig = derToRaw(new Uint8Array(signature));
  const token = `${unsignedToken}.${base64urlEncode(rawSig)}`;

  const publicKeyBytes = base64urlDecode(publicKey);

  return {
    Authorization: `vapid t=${token}, k=${base64urlEncode(publicKeyBytes)}`,
  };
}

async function importVapidPrivateKey(publicKeyB64: string, privateKeyB64: string) {
  const publicKeyBytes = base64urlDecode(publicKeyB64);
  const privateKeyBytes = base64urlDecode(privateKeyB64);

  // Build JWK from raw keys
  const x = base64urlEncode(publicKeyBytes.slice(1, 33));
  const y = base64urlEncode(publicKeyBytes.slice(33, 65));
  const d = base64urlEncode(privateKeyBytes);

  const jwk = { kty: "EC", crv: "P-256", x, y, d };

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function encryptPayload(
  payload: string,
  p256dhB64: string,
  authB64: string
) {
  const userPublicKeyBytes = base64urlDecode(p256dhB64);
  const authSecret = base64urlDecode(authB64);
  const payloadBytes = new TextEncoder().encode(payload);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: userPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive auth_info -> PRK -> content encryption key + nonce
  // IKM for auth: ECDH shared secret
  // salt for auth: auth secret from subscription
  // info for auth: "WebPush: info\0" + client_public + server_public
  const authInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\0"),
    ...userPublicKeyBytes,
    ...localPublicKeyRaw,
  ]);

  const prk = await hkdf(authSecret, sharedSecret, authInfo, 32);

  // Derive content encryption key (CEK)
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdf(salt, prk, cekInfo, 16);

  // Derive nonce
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Pad payload: add delimiter byte 0x02 then zero padding
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  // Encrypt with AES-128-GCM
  const key = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      paddedPayload
    )
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const recordSize = paddedPayload.length + 16; // +16 for tag
  const rs = new DataView(new ArrayBuffer(4));
  rs.setUint32(0, recordSize);

  const result = new Uint8Array(
    16 + 4 + 1 + localPublicKeyRaw.length + encrypted.length
  );
  result.set(salt, 0);
  result.set(new Uint8Array(rs.buffer), 16);
  result[20] = localPublicKeyRaw.length;
  result.set(localPublicKeyRaw, 21);
  result.set(encrypted, 21 + localPublicKeyRaw.length);

  return result;
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    salt.length ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));

  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const infoWithCounter = new Uint8Array([...info, 1]);
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // ECDSA signature from WebCrypto can be raw (64 bytes) or DER-encoded
  if (der.length === 64) return der;
  
  // Parse DER: SEQUENCE { INTEGER r, INTEGER s }
  const raw = new Uint8Array(64);
  let offset = 2; // skip SEQUENCE tag and length
  
  // Read r
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  
  // Read s
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  
  return raw;
}
