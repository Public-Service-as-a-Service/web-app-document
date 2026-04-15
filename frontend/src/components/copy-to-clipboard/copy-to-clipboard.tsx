'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';
import { Button } from '@components/ui/button';
import { toast } from 'sonner';

interface CopyToClipboardProps {
  value: string;
  ariaLabel?: string;
}

export function CopyToClipboard({ value, ariaLabel }: CopyToClipboardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t('common:copy_success'));
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // silent
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label={ariaLabel ?? t('common:copy_to_clipboard')}
      type="button"
    >
      {copied ? (
        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
