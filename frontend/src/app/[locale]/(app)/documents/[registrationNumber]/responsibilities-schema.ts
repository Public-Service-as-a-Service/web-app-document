import { z } from 'zod';

export const responsibilitiesSchema = z.object({
  responsibilities: z.array(z.string().min(1)),
});

export type ResponsibilitiesFormValues = z.infer<typeof responsibilitiesSchema>;
