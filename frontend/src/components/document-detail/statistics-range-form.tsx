'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, startOfDay, subDays } from 'date-fns';
import { sv, enUS, type Locale } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Button } from '@components/ui/button';
import { Calendar } from '@components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@components/ui/toggle-group';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@components/ui/form';
import { cn } from '@lib/utils';
import type { StatisticsRange } from './use-document-statistics';

type Preset = '7d' | '30d' | '90d' | 'all' | 'custom';

const rangeSchema = z.object({
  preset: z.enum(['7d', '30d', '90d', 'all', 'custom']),
  from: z.date().optional(),
  to: z.date().optional(),
});

type RangeFormValue = z.infer<typeof rangeSchema>;

const PRESET_DAYS: Record<Exclude<Preset, 'all' | 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const presetRange = (preset: Exclude<Preset, 'custom'>): Pick<RangeFormValue, 'from' | 'to'> => {
  if (preset === 'all') return { from: undefined, to: undefined };
  const today = startOfDay(new Date());
  return { from: subDays(today, PRESET_DAYS[preset]), to: today };
};

const dateFnsLocale = (locale: string): Locale => (locale?.startsWith('sv') ? sv : enUS);

// The calendar treats the end date as inclusive but upstream's stats window
// is [from, to) — shift one day forward so "through April 30" lands April 30
// in the result.
const toApiRange = (value: RangeFormValue): StatisticsRange => ({
  from: value.from ? startOfDay(value.from).toISOString() : undefined,
  to: value.to ? addDays(startOfDay(value.to), 1).toISOString() : undefined,
});

export interface StatisticsRangeFormProps {
  onChange: (range: StatisticsRange) => void;
  locale: string;
}

export const StatisticsRangeForm = ({ onChange, locale }: StatisticsRangeFormProps) => {
  const { t } = useTranslation();

  const form = useForm<RangeFormValue>({
    resolver: zodResolver(rangeSchema),
    defaultValues: { preset: '30d', ...presetRange('30d') },
  });

  const preset = form.watch('preset');
  const from = form.watch('from');
  const to = form.watch('to');

  useEffect(() => {
    onChange(toApiRange({ preset, from, to }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, from?.getTime(), to?.getTime()]);

  const handlePresetChange = (next: string | undefined) => {
    if (!next) return;
    const typed = next as Preset;
    if (typed === 'custom') {
      form.setValue('preset', 'custom');
      return;
    }
    const range = presetRange(typed);
    form.setValue('preset', typed);
    form.setValue('from', range.from);
    form.setValue('to', range.to);
  };

  const rangeLabel = (() => {
    const fmt = (d: Date) =>
      dayjs(d)
        .locale(locale?.startsWith('sv') ? 'sv' : 'en')
        .format('D MMM YYYY');
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from) return fmt(from);
    return t('common:statistics_range_pick');
  })();

  return (
    <Form {...form}>
      <form className="flex flex-wrap items-end gap-3">
        <FormField
          control={form.control}
          name="preset"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('common:statistics_range_label')}
              </FormLabel>
              <FormControl>
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={handlePresetChange}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="7d">
                    {t('common:statistics_range_preset_7d')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="30d">
                    {t('common:statistics_range_preset_30d')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="90d">
                    {t('common:statistics_range_preset_90d')}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="all">
                    {t('common:statistics_range_preset_all')}
                  </ToggleGroupItem>
                </ToggleGroup>
              </FormControl>
            </FormItem>
          )}
        />

        <FormItem className="gap-1.5">
          <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('common:statistics_range_custom')}
          </FormLabel>
          <FormControl>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'justify-start font-normal',
                    preset === 'all' && !from && !to && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {rangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  locale={dateFnsLocale(locale)}
                  defaultMonth={from ?? new Date()}
                  selected={{ from, to }}
                  onSelect={(range) => {
                    form.setValue('preset', 'custom');
                    form.setValue('from', range?.from);
                    form.setValue('to', range?.to);
                  }}
                  numberOfMonths={2}
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
          </FormControl>
        </FormItem>
      </form>
    </Form>
  );
};
