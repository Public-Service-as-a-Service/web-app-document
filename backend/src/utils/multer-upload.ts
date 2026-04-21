import type { RequestHandler } from 'express';
import multer from 'multer';

// Busboy (used by multer) decodes multipart `filename` params as latin1 by
// default. Browsers send the raw UTF-8 bytes, so `file.originalname` arrives
// as a latin1 misinterpretation of those bytes. macOS compounds this by
// sending filenames in NFD form. We reinterpret the bytes as UTF-8 and
// normalize to NFC so every handler sees the filename the user actually typed.
const repairFilename = (raw: string): string =>
  Buffer.from(raw, 'latin1').toString('utf8').normalize('NFC');

const repairReqFiles = (req: { file?: Express.Multer.File; files?: unknown }) => {
  const fix = (file: Express.Multer.File) => {
    if (file?.originalname) file.originalname = repairFilename(file.originalname);
  };
  if (req.file) fix(req.file);
  if (Array.isArray(req.files)) {
    req.files.forEach(fix);
  } else if (req.files && typeof req.files === 'object') {
    for (const files of Object.values(req.files as Record<string, Express.Multer.File[]>)) {
      files.forEach(fix);
    }
  }
};

const withFilenameRepair =
  (mw: RequestHandler): RequestHandler =>
  (req, res, next) =>
    mw(req, res, (err?: unknown) => {
      if (!err) repairReqFiles(req);
      next(err as never);
    });

const base = multer();

export const upload = {
  fields: (fields: Parameters<typeof base.fields>[0]) => withFilenameRepair(base.fields(fields)),
  single: (name: string) => withFilenameRepair(base.single(name)),
  array: (name: string, maxCount?: number) => withFilenameRepair(base.array(name, maxCount)),
  any: () => withFilenameRepair(base.any()),
  none: () => base.none(),
};
