import { z } from 'zod';
import { isValidUrl } from '@utils/document-metadata';

// The form renders i18n error strings directly when a field is invalid,
// so refine() messages are intentionally omitted here.
const optionalUrl = z
  .string()
  .optional()
  .refine((value) => !value || isValidUrl(value));

export const createDocumentSchema = z
  .object({
    title: z.string().min(1).max(255),
    description: z.string().min(1),
    type: z.string().min(1),
    departmentOrgId: z.string().optional(),
    departmentOrgName: z.string().optional(),
    caseNumber: z.string().optional(),
    caseUrl: optionalUrl,
    responsibilities: z.array(z.string().min(1)).min(1),
    validFrom: z.string().min(1),
    validTo: z.string().min(1),
  })
  // YYYY-MM-DD strings sort lexicographically the same as chronologically,
  // so a plain >= check on the date-input values is enough.
  .refine((data) => data.validTo >= data.validFrom, { path: ['validTo'] });

export type CreateDocumentFormValues = z.infer<typeof createDocumentSchema>;
