import { toast } from 'sonner';

export async function runMutation<T>(
  fn: () => Promise<T>,
  opts: { success?: string; error: string }
): Promise<T> {
  try {
    const result = await fn();
    if (opts.success) toast.success(opts.success);
    return result;
  } catch (error) {
    toast.error(opts.error);
    throw error;
  }
}
