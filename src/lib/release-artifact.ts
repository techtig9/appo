import JSZip from "jszip";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

export interface ReleaseFile { path: string; content: string }

const BUCKET = "app-releases";
const MAX_FILES = 500;
const MAX_FILE_BYTES = 750_000;

function safePath(path: string): boolean {
  return !!path && !path.startsWith("/") && !path.includes("\\") && !path.split("/").includes("..") && !/^\s*$/.test(path);
}

export async function createReleaseArtifact(appId: string, version: number, files: ReleaseFile[]) {
  if (!files.length) throw new Error("Cannot create an empty release artifact.");
  if (files.length > MAX_FILES) throw new Error("Project contains too many files.");

  const zip = new JSZip();
  for (const file of files) {
    if (!safePath(file.path)) throw new Error(`Unsafe project path: ${file.path}`);
    const bytes = Buffer.byteLength(file.content, "utf8");
    if (bytes > MAX_FILE_BYTES) throw new Error(`Project file is too large: ${file.path}`);
    zip.file(file.path, file.content);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const path = `apps/${appId}/releases/v${version}.zip`;
  const admin = createServiceRoleClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: "application/zip",
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw error;
  return { bucket: BUCKET, path, checksum, sizeBytes: buffer.byteLength };
}

export async function getSignedReleaseUrl(path: string, expiresIn = 900) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not create release URL");
  return data.signedUrl;
}
