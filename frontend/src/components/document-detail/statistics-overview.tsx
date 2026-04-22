'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Download, Eye } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card } from '@components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@components/ui/chart';
import { toDisplayRevision } from '@utils/document-revision';
import type { DocumentStatistics } from '@interfaces/document.interface';

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'neutral' | 'views' | 'downloads';
}

const toneClasses: Record<SummaryCardProps['tone'], string> = {
  neutral: 'bg-muted/40 text-foreground',
  views: 'bg-chart-2/10 text-chart-2',
  downloads: 'bg-chart-1/10 text-chart-1',
};

const SummaryCard = ({ label, value, icon, tone }: SummaryCardProps) => (
  <Card className="flex-row items-center gap-4 p-5">
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}
      aria-hidden="true"
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-2xl tabular-nums text-foreground">
        {value.toLocaleString('sv-SE')}
      </p>
    </div>
  </Card>
);

export interface StatisticsOverviewProps {
  statistics: DocumentStatistics | null;
}

export const StatisticsOverview = ({ statistics }: StatisticsOverviewProps) => {
  const { t } = useTranslation();

  const { totalViews, totalDownloads, totalAccesses, chartData } = useMemo(() => {
    const revisions = statistics?.perRevision ?? [];
    let views = 0;
    let downloads = 0;
    for (const r of revisions) {
      views += r.views ?? 0;
      downloads += r.downloads ?? 0;
    }
    const data = revisions
      .slice()
      .sort((a, b) => (a.revision ?? 0) - (b.revision ?? 0))
      .map((r) => ({
        revision: `r${toDisplayRevision(r.revision ?? 0)}`,
        views: r.views ?? 0,
        downloads: r.downloads ?? 0,
      }));
    return {
      totalViews: views,
      totalDownloads: downloads,
      totalAccesses: statistics?.totalAccesses ?? views + downloads,
      chartData: data,
    };
  }, [statistics]);

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      views: {
        label: t('common:statistics_views'),
        color: 'var(--chart-2)',
      },
      downloads: {
        label: t('common:statistics_downloads'),
        color: 'var(--chart-1)',
      },
    }),
    [t]
  );

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label={t('common:statistics_total')}
          value={totalAccesses}
          icon={<Activity className="h-5 w-5" />}
          tone="neutral"
        />
        <SummaryCard
          label={t('common:statistics_views')}
          value={totalViews}
          icon={<Eye className="h-5 w-5" />}
          tone="views"
        />
        <SummaryCard
          label={t('common:statistics_downloads')}
          value={totalDownloads}
          icon={<Download className="h-5 w-5" />}
          tone="downloads"
        />
      </div>

      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t('common:statistics_chart_title')}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('common:statistics_chart_description')}
          </p>
        </div>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('common:statistics_empty')}
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="revision"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={32}
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="views" stackId="a" fill="var(--color-views)" radius={[0, 0, 2, 2]} />
              <Bar
                dataKey="downloads"
                stackId="a"
                fill="var(--color-downloads)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </Card>
    </section>
  );
};
