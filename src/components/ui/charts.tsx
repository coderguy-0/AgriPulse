import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { SectionCard } from './primitives';

/**
 * Chart presets for the whole platform.
 *
 * Every chart in AGRIPULSE is drawn through these wrappers so axes, grid lines, tooltips,
 * units and legends look identical in the dashboard, monitoring, twin, soil and reports
 * modules. Missing values are represented by gaps (never by zero) because series data comes
 * from real readings only.
 */

export const CHART_COLOURS = {
  green: '#4c8b3c',
  leaf: '#72a94b',
  forest: '#285b32',
  water: '#2f6f9f',
  amber: '#c78a2f',
  red: '#b4413c',
  earth: '#8d6c40',
  neutral: '#9aa39c',
};

const axisStyle = { fontSize: 10, fill: '#6b7a6d', fontWeight: 600 } as const;

const gridProps = { stroke: '#e6ece2', strokeDasharray: '3 4', vertical: false } as const;

export interface ChartCardProps {
  title: string;
  description?: React.ReactNode;
  unit?: string;
  actions?: React.ReactNode;
  height?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  unit,
  actions,
  height = 240,
  footer,
  children,
}) => (
  <SectionCard
    title={title}
    description={description}
    actions={
      <>
        {unit && <span className="ap-badge ap-badge--muted">{unit}</span>}
        {actions}
      </>
    }
    footer={footer}
  >
    <div className="ap-chart-frame" style={{ minHeight: height }}>
      {children}
    </div>
  </SectionCard>
);

export interface SeriesDefinition {
  key: string;
  name: string;
  colour: string;
  unit?: string;
  /** Renders as a dashed line (used for thresholds/estimated values). */
  dashed?: boolean;
}

const tooltipFormatter = (series: SeriesDefinition[]) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function TooltipContent({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const timestamp = payload[0]?.payload?.timestamp;
    return (
      <div className="ap-chart-tooltip">
        <strong>
          {timestamp
            ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
            : label}
        </strong>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any) => {
          const definition = series.find((item) => item.key === entry.dataKey);
          return (
            <span key={entry.dataKey} style={{ display: 'block' }}>
              {definition?.name || entry.name}: {Number(entry.value).toLocaleString('en-IN')}
              {definition?.unit ? ` ${definition.unit}` : ''}
            </span>
          );
        })}
      </div>
    );
  };

export type ChartDatum = { label?: string; timestamp?: number } & Record<string, number | string | null | undefined>;

export interface TrendChartProps {
  data: ChartDatum[];
  series: SeriesDefinition[];
  /** Y-axis unit label, e.g. "%" or "°C". */
  yUnit?: string;
  yDomain?: [number | 'auto', number | 'auto'];
  /** Optional reference band, e.g. an agronomic moisture band. */
  band?: { min: number; max: number; label: string; colour?: string };
  threshold?: { value: number; label: string };
  height?: number;
  variant?: 'line' | 'area' | 'bar';
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  series,
  yUnit,
  yDomain = ['auto', 'auto'],
  band,
  threshold,
  height = 240,
  variant = 'line',
}) => {
  const TooltipContent = tooltipFormatter(series);
  const commonAxisProps = {
    tick: axisStyle,
    tickLine: false,
    axisLine: { stroke: '#dfe7db' },
  } as const;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...commonAxisProps} minTickGap={18} />
            <YAxis {...commonAxisProps} unit={yUnit} domain={yDomain} width={46} />
            <Tooltip content={<TooltipContent />} />
            {series.map((item) => (
              <Bar key={item.key} dataKey={item.key} name={item.name} fill={item.colour} radius={[5, 5, 0, 0]} maxBarSize={34} />
            ))}
          </BarChart>
        ) : variant === 'area' ? (
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
            <defs>
              {series.map((item) => (
                <linearGradient key={item.key} id={`ap-grad-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={item.colour} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={item.colour} stopOpacity={0.04} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...commonAxisProps} minTickGap={18} />
            <YAxis {...commonAxisProps} unit={yUnit} domain={yDomain} width={46} />
            <Tooltip content={<TooltipContent />} />
            {band && (
              <ReferenceArea
                y1={band.min}
                y2={band.max}
                fill={band.colour || '#cfe3c2'}
                fillOpacity={0.28}
                stroke="none"
                ifOverflow="extendDomain"
              />
            )}
            {threshold && <ReferenceLine y={threshold.value} stroke={CHART_COLOURS.amber} strokeDasharray="4 4" label={{ value: threshold.label, position: 'insideTopRight', fontSize: 10, fill: '#8a5a12' }} />}
            {series.map((item) => (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={item.colour}
                strokeWidth={2}
                strokeDasharray={item.dashed ? '5 4' : undefined}
                fill={`url(#ap-grad-${item.key})`}
                connectNulls={false}
                dot={false}
                activeDot={{ r: 3.5 }}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...commonAxisProps} minTickGap={18} />
            <YAxis {...commonAxisProps} unit={yUnit} domain={yDomain} width={46} />
            <Tooltip content={<TooltipContent />} />
            {band && (
              <ReferenceArea
                y1={band.min}
                y2={band.max}
                fill={band.colour || '#cfe3c2'}
                fillOpacity={0.28}
                stroke="none"
                ifOverflow="extendDomain"
              />
            )}
            {threshold && <ReferenceLine y={threshold.value} stroke={CHART_COLOURS.amber} strokeDasharray="4 4" label={{ value: threshold.label, position: 'insideTopRight', fontSize: 10, fill: '#8a5a12' }} />}
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 10.5, fontWeight: 700 }} />}
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={item.colour}
                strokeWidth={2}
                strokeDasharray={item.dashed ? '5 4' : undefined}
                connectNulls={false}
                dot={false}
                activeDot={{ r: 3.5 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export const ChartLegend: React.FC<{ items: { colour: string; label: string }[] }> = ({ items }) => (
  <div className="ap-chart-legend">
    {items.map((item) => (
      <span key={item.label}>
        <i style={{ background: item.colour }} aria-hidden="true" />
        {item.label}
      </span>
    ))}
  </div>
);
