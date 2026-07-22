/** Thin TypeScript binding to the canonical simplicio.loop-extension/v1 contract. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const EXTENSION_SCHEMA = "simplicio.loop-extension/v1";
export const EXTENSION_ID = "loop_marketing";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_MANIFEST_PATH = resolve(PACKAGE_ROOT, "extension/manifest.json");

export interface ExtensionManifest {
  schema: typeof EXTENSION_SCHEMA; extension_id: string; name: string; version: string; domain: string;
  requires_core: { min_version?: string; max_version?: string };
  capabilities?: { requires?: string[]; provides?: string[] };
  source_adapters?: Array<{adapter_id:string;kind:string}>;
  context_schemas?: Array<{schema_id:string;version:string;migrations?:unknown[]}>;
  stage_overlays?: unknown[]; role_bindings?: unknown[]; gates?: unknown[];
  effect_handlers?: Array<{effect_id:string;idempotent:true;requires_fence_token:true;requires_receipt:true;compensation?:unknown}>;
  resource_classes?: Array<{class_id:string;concurrency_cap?:number;budget?:unknown}>;
  receipt_schemas?: Array<{schema_id:string;version:string}>; feature_flags?: unknown[];
}

export interface ManifestCheck { ok:boolean; errors:string[]; manifest?:ExtensionManifest; manifest_hash?:string }
const semver = (value:string):[number,number,number]|null => { const m=/^(\d+)\.(\d+)\.(\d+)$/.exec(value); return m ? [+m[1],+m[2],+m[3]] : null; };
const cmp = (a:[number,number,number],b:[number,number,number]) => a[0]-b[0] || a[1]-b[1] || a[2]-b[2];
export function validateExtensionManifest(value:unknown, coreVersion?:string, baseDir=PACKAGE_ROOT):ManifestCheck {
  const errors:string[]=[]; const m=value as Partial<ExtensionManifest>;
  if (!m || typeof m!=="object") return {ok:false,errors:["manifest must be an object"]};
  if(m.schema!==EXTENSION_SCHEMA) errors.push(`schema must be ${EXTENSION_SCHEMA}`);
  if(m.extension_id!==EXTENSION_ID) errors.push(`extension_id must be ${EXTENSION_ID}`);
  if(!semver(String(m.version??""))) errors.push("version must be semver");
  const min=semver(String(m.requires_core?.min_version??"")), max=semver(String(m.requires_core?.max_version??""));
  if(!min||!max) errors.push("requires_core must pin min_version and max_version");
  if(coreVersion){const c=semver(coreVersion);if(!c)errors.push("core version must be semver");else if(min&&max&&(cmp(c,min)<0||cmp(c,max)>0))errors.push(`core ${coreVersion} is incompatible; requires ${m.requires_core?.min_version}..${m.requires_core?.max_version}`);}
  for(const effect of m.effect_handlers??[]) if(effect.idempotent!==true||effect.requires_fence_token!==true||effect.requires_receipt!==true) errors.push(`effect ${effect.effect_id} must require idempotency, fence and receipt`);
  const declared=m.capabilities?.provides??[];
  for(const entry of declared.filter((x)=>x.startsWith("schema-sha256:"))){const [,relative,expected]=entry.split(":");const path=resolve(baseDir,relative);if(!existsSync(path))errors.push(`schema missing: ${relative}`);else {const actual=createHash("sha256").update(readFileSync(path)).digest("hex");if(actual!==expected)errors.push(`schema hash mismatch: ${relative}`);}}
  const manifest=m as ExtensionManifest; return {ok:errors.length===0,errors,...(errors.length?{}:{manifest,manifest_hash:createHash("sha256").update(JSON.stringify(manifest)).digest("hex")})};
}
export function loadExtensionManifest(coreVersion=process.env.SIMPLICIO_LOOP_CORE_VERSION??"3.38.1", path=process.env.SIMPLICIO_LOOP_EXTENSION_MANIFEST??DEFAULT_MANIFEST_PATH):ExtensionManifest {
  const check=validateExtensionManifest(JSON.parse(readFileSync(path,"utf8")),coreVersion,PACKAGE_ROOT);
  if(!check.ok) throw new Error(`loop.marketing extension incompatible: ${check.errors.join("; ")}`);
  return check.manifest!;
}

export type CoreMode="embedded"|"daemon"|"remote";
export interface CoreReceipt {schema:"simplicio.extension-dispatch-receipt/v1";extension_id:typeof EXTENSION_ID;run_id:string;task_id:string;stage_id:string;attempt:number;fence_token:string;manifest_hash:string;input_hash:string;output_hash:string;status:"completed"|"blocked";mode:CoreMode}
/** Removes transport-only mode so conformance can prove equivalent receipts. */
export function canonicalReceipt(receipt:CoreReceipt):Omit<CoreReceipt,"mode"> { const {mode:_,...canonical}=receipt; return canonical; }

export interface EffectAuthority { reconcile(key:string):Promise<{confirmed:boolean;receipt?:unknown}>; authorize(intent:{effect_id:string;idempotency_key:string;fence_token:string}):Promise<{allowed:boolean}>; confirm(key:string,result:unknown):Promise<unknown> }
/** Exactly-once is delegated to core: reconcile first, then fenced authorization and durable confirmation. */
export async function runGovernedEffect(authority:EffectAuthority,input:{effect_id:string;idempotency_key:string;fence_token:string},execute:()=>Promise<unknown>):Promise<{deduplicated:boolean;receipt:unknown}>{
  if(!input.idempotency_key||!input.fence_token)throw new Error("effect requires core idempotency key and fence token");
  const prior=await authority.reconcile(input.idempotency_key);if(prior.confirmed)return {deduplicated:true,receipt:prior.receipt};
  if(!(await authority.authorize(input)).allowed)throw new Error("effect blocked by Loop core authority");
  const result=await execute();return {deduplicated:false,receipt:await authority.confirm(input.idempotency_key,result)};
}
