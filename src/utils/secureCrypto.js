// secureCrypto.js
const enc = new TextEncoder();
const dec = new TextDecoder();

// Convert bytes → base64 WITHOUT spreading the whole array into
// String.fromCharCode(...) — spreading overflows the call stack (~125k args),
// so encrypting a large payload (big party booking, bulk op) would throw.
// Chunked apply() keeps each call well under the argument limit.
function bufferToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const CHUNK = 0x8000; // 32 KB per chunk
  for (let i = 0; i < arr.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, arr.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// 32 characters = 256-bit key
// Production builds only — import.meta.env.PROD is true for "vite build",
// false for the "vite" dev server, so dev never encrypts/decrypts.
const isProduction = import.meta.env.PROD;
const configuredKey = import.meta.env.VITE_ENCRYPTION_KEY;
const keyString =
  configuredKey || (isProduction ? "" : "12345678901234567890123456789012");

async function getAESKey() {
  if (keyString.length !== 32) {
    throw new Error(
      isProduction
        ? "VITE_ENCRYPTION_KEY must be set to exactly 32 characters in production."
        : "VITE_ENCRYPTION_KEY must be exactly 32 characters."
    );
  }
  const keyBuffer = enc.encode(keyString);
  return crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptWithAES(data) {
  const key = await getAESKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

  const encoded = enc.encode(JSON.stringify(data));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    encrypted: bufferToBase64(new Uint8Array(encryptedBuffer)),
    iv: bufferToBase64(iv),
  };
}

export async function decryptWithAES({ encrypted, iv }) {
  const key = await getAESKey();
  const encryptedBytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encryptedBytes
  );

  return JSON.parse(dec.decode(decryptedBuffer));
}
