import { appendFileSync, closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { deserialize, serialize } from "node:v8";

const HEADER_BYTES = 16;
const VERSION = 1;
const MAX_RECORD_BYTES = 16 * 1024 * 1024;

export type BinaryKind = "HBP" | "HBI";

function checksum(bytes: Uint8Array): number {
  let value = 0x811c9dc5;
  for (const byte of bytes) value = Math.imul(value ^ byte, 0x01000193) >>> 0;
  return value;
}

export function encodeEnvelope(kind: BinaryKind, value: unknown): Buffer {
  const payload = serialize(value);
  if (payload.byteLength > MAX_RECORD_BYTES) throw new Error(`binary record exceeds ${MAX_RECORD_BYTES} bytes`);
  const out = Buffer.allocUnsafe(HEADER_BYTES + payload.byteLength);
  out.write(kind, 0, 3, "ascii");
  out[3] = 0;
  out.writeUInt16BE(VERSION, 4);
  out.writeUInt16BE(0, 6);
  out.writeUInt32BE(payload.byteLength, 8);
  out.writeUInt32BE(checksum(payload), 12);
  payload.copy(out, HEADER_BYTES);
  return out;
}

function decodeAt<T>(bytes: Buffer, offset: number, expected: BinaryKind): { value: T; next: number } {
  if (bytes.byteLength - offset < HEADER_BYTES) throw new Error("truncated binary envelope header");
  const kind = bytes.toString("ascii", offset, offset + 3);
  if (kind !== expected || bytes[offset + 3] !== 0) throw new Error(`expected ${expected} envelope`);
  const version = bytes.readUInt16BE(offset + 4);
  if (version !== VERSION) throw new Error(`unsupported ${expected} version ${version}`);
  const length = bytes.readUInt32BE(offset + 8);
  if (length > MAX_RECORD_BYTES) throw new Error(`binary record exceeds ${MAX_RECORD_BYTES} bytes`);
  const end = offset + HEADER_BYTES + length;
  if (end > bytes.byteLength) throw new Error("truncated binary envelope payload");
  const payload = bytes.subarray(offset + HEADER_BYTES, end);
  if (checksum(payload) !== bytes.readUInt32BE(offset + 12)) throw new Error("binary envelope checksum mismatch");
  return { value: deserialize(payload) as T, next: end };
}

export function decodeEnvelope<T>(bytes: Buffer, kind: BinaryKind): T {
  const decoded = decodeAt<T>(bytes, 0, kind);
  if (decoded.next !== bytes.byteLength) throw new Error("trailing bytes after binary envelope");
  return decoded.value;
}

export function appendHbp(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, encodeEnvelope("HBP", value));
}

export function readHbp<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const bytes = readFileSync(path);
  const rows: T[] = [];
  let offset = 0;
  while (offset < bytes.byteLength) {
    const decoded = decodeAt<T>(bytes, offset, "HBP");
    rows.push(decoded.value);
    offset = decoded.next;
  }
  return rows;
}

export function writeHbiAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}-${Date.now()}`;
  const fd = openSync(temp, "wx", 0o600);
  try {
    writeFileSync(fd, encodeEnvelope("HBI", value));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temp, path);
}

export function readHbi<T>(path: string): T {
  return decodeEnvelope<T>(readFileSync(path), "HBI");
}
