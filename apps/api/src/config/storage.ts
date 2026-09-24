import fs from "node:fs/promises";
import path from "node:path";
import { env } from "./environment";

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

export interface StoredFile {
  filename: string;
  url: string;
}

export const getUploadRoot = (): string => uploadRoot;

export const ensureUploadDir = async (): Promise<void> => {
  await fs.mkdir(uploadRoot, { recursive: true });
};

export const saveFile = async (file: { originalname: string; buffer: Buffer }): Promise<StoredFile> => {
  await ensureUploadDir();
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
  await fs.writeFile(path.join(uploadRoot, filename), file.buffer);
  return {
    filename,
    url: `${env.PUBLIC_API_URL.replace(/\/$/, "")}/uploads/${filename}`,
  };
};

export const deleteFile = async (filename: string): Promise<void> => {
  const target = path.join(uploadRoot, path.basename(filename));
  await fs.rm(target, { force: true });
};
