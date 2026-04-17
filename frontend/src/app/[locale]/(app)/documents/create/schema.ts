import { z } from 'zod';

export const createDocumentSchema = z
  .object({
    description: z.string().min(1),
    type: z.string().min(1),
    departmentOrgId: z.string().optional(),
    departmentOrgName: z.string().optional(),
    responsibilities: z.array(z.string().min(1)).min(1),
    validFrom: z.string().min(1),
    validTo: z.string().min(1),
  })
  .refine((data) => data.validTo >= data.validFrom, {
    path: ['validTo'],
    // YYYY-MM-DD strings sort lexicographically the same as chronologically,
    // so a plain >= check on the date-input values is enough.
    message: 'validTo must be on or after validFrom',
  });

export type CreateDocumentFormValues = z.infer<typeof createDocumentSchema>;
