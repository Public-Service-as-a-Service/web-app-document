import { z } from 'zod';

export const createDocumentSchema = z.object({
  description: z.string().min(1),
  type: z.string().min(1),
  departmentOrgId: z.string().optional(),
  departmentOrgName: z.string().optional(),
  responsibilities: z.array(z.string().min(1)).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

export type CreateDocumentFormValues = z.infer<typeof createDocumentSchema>;
