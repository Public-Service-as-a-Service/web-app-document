import { z } from 'zod';

export const createDocumentSchema = z.object({
  description: z.string().min(1),
  type: z.string().min(1),
  confidential: z.boolean(),
  legalCitation: z.string(),
  metadataList: z.array(z.object({ key: z.string(), value: z.string() })),
});

export type CreateDocumentFormValues = z.infer<typeof createDocumentSchema>;
