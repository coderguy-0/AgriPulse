import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Info, X } from 'lucide-react';
import { AgriPulseLoader } from '../AgriPulseLoader';
import { ProvenanceKind } from '../../services/provenance';

/* ---------------------------------------------------------------------------
   Page scaffolding
   ------------------------------------------------------------------------- */

export interface Breadcrumb {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Consistent page title block: breadcrumbs, eyebrow, title, description, and
 * page-level actions. Every portal module uses this so headings line up exactly.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  breadcrumbs,
  actions,
  children,
}) => (
  <div className="ap-stack" style={{ gap: 12 }}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav className="ap-breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={`${crumb.label}-${index}`}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {crumb.to && index < breadcrumbs.length - 1 ? (
              <a href={crumb.to}>{crumb.label}</a>
            ) : (
              <span aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    )}
    <div className="ap-page-head">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="ap-eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div>}
        <h1 className="ap-page-title">{title}</h1>
        {subtitle && <p className="ap-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ap-page-actions ap-no-print">{actions}</div>}
    </div>
    {children}
  </div>
);

export interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'article' | 'div';
  id?: string;
  variant?: 'default' | 'quiet' | 'tint';
}

/** Shared surface used for every panel, table container, and detail block. */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon,
  actions,
  footer,
  children,
  className = '',
  as: Tag = 'section',
  id,
  variant = 'default',
}) => {
  const variantClass = variant === 'quiet' ? 'ap-card--quiet' : variant === 'tint' ? 'ap-card--tint' : '';
  return (
    <Tag id={id} className={`ap-card ${variantClass} ${className}`.trim()}>
      {(title || actions) && (
        <div className="ap-card-head">
          <div style={{ minWidth: 0 }}>
            {title && (
              <h2 className="ap-card-title">
                {icon}
                <span>{title}</span>
              </h2>
            )}
            {description && <p className="ap-card-desc">{description}</p>}
          </div>
          {actions && <div className="ap-card-actions ap-no-print">{actions}</div>}
        </div>
      )}
      <div className="ap-card-body">{children}</div>
      {footer && <div className="ap-card-foot">{footer}</div>}
    </Tag>
  );
};

/* ---------------------------------------------------------------------------
   Metric tiles
   ------------------------------------------------------------------------- */

export type KpiTone = 'default' | 'water' | 'amber' | 'danger' | 'neutral';

export interface KpiTileProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: React.ReactNode;
  tone?: KpiTone;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
}

export const KpiTile: React.FC<KpiTileProps> = ({ label, value, unit, icon, tone = 'default', footer, badge }) => (
  <article className="ap-kpi">
    <div className="ap-kpi-top">
      <span className="ap-kpi-label">{label}</span>
      {icon && (
        <span className={`ap-kpi-icon${tone === 'default' ? '' : ` ap-kpi-icon--${tone}`}`} aria-hidden="true">
          {icon}
        </span>
      )}
    </div>
    <p className={`ap-kpi-value${value === '—' || value === null ? ' is-empty' : ''}`}>
      {value}
      {unit && <span>{unit}</span>}
    </p>
    {(footer || badge) && (
      <div className="ap-kpi-foot">
        {badge}
        {footer}
      </div>
    )}
  </article>
);

/* ---------------------------------------------------------------------------
   Data provenance and status badges
   ------------------------------------------------------------------------- */

export interface ProvenanceTagProps {
  kind: ProvenanceKind;
  label?: string;
}

/** Short, honest label explaining where a value came from. */
export const ProvenanceTag: React.FC<ProvenanceTagProps> = ({ kind, label }) => {
  const text = label || PROVENANCE_LABELS[kind];
  return (
    <span className={`ap-source-tag ap-source-tag--${kind}`}>
      {text}
    </span>
  );
};

export const PROVENANCE_LABELS: Record<ProvenanceKind, string> = {
  measured: 'Sensor measured',
  recorded: 'Farmer recorded',
  forecast: 'Forecast',
  rule: 'Rule-based',
  demo: 'Sample data',
  unavailable: 'Not available',
};

export type BadgeTone = 'default' | 'ok' | 'info' | 'warn' | 'danger' | 'muted' | 'outline';

export const StatusBadge: React.FC<{ tone?: BadgeTone; icon?: React.ReactNode; children: React.ReactNode; title?: string }> = ({
  tone = 'default',
  icon,
  children,
  title,
}) => (
  <span className={`ap-badge${tone === 'default' ? '' : ` ap-badge--${tone}`}`} title={title}>
    {icon}
    {children}
  </span>
);

/* ---------------------------------------------------------------------------
   Notices, empty states, loading
   ------------------------------------------------------------------------- */

export const Notice: React.FC<{
  tone?: 'info' | 'ok' | 'warn' | 'danger' | 'neutral';
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ tone = 'neutral', title, children, action, className = '', style }) => {
  const variant = tone === 'neutral' ? '' : ` ap-notice--${tone}`;
  const Icon = tone === 'danger' || tone === 'warn' ? AlertTriangle : tone === 'ok' ? CheckCircle2 : Info;
  return (
    <div className={`ap-notice${variant} ${className}`.trim()} style={style} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon size={15} aria-hidden="true" />
      <div style={{ minWidth: 0, flex: 1 }}>
        {title && <strong>{title}</strong>}
        {title && children ? ' ' : null}
        {children}
        {action && <div style={{ marginTop: 9 }} className="ap-no-print">{action}</div>}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="ap-empty">
    <span className="ap-empty-icon" aria-hidden="true">{icon || <Info size={19} />}</span>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action && <div className="ap-no-print">{action}</div>}
  </div>
);

export const Skeleton: React.FC<{ height?: number; width?: string; radius?: number; className?: string }> = ({
  height = 14,
  width = '100%',
  radius = 8,
  className = '',
}) => (
  <span
    aria-hidden="true"
    className={`ap-skeleton ${className}`.trim()}
    style={{ display: 'block', height, width, borderRadius: radius }}
  />
);

export const SkeletonBlock: React.FC<{ rows?: number; label?: string }> = ({ rows = 3, label = 'Loading content' }) => (
  <div role="status" aria-live="polite" className="ap-stack ap-stack--tight">
    <span className="sr-only">{label}</span>
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} height={index === 0 ? 20 : 13} width={index === 0 ? '42%' : '100%'} />
    ))}
  </div>
);

export const Spinner: React.FC<{ size?: number; label?: string }> = ({ size = 15, label }) => (
  <span className="inline-flex items-center gap-2" role={label ? 'status' : undefined} aria-live={label ? 'polite' : undefined}>
    <AgriPulseLoader size={size <= 20 ? 'sm' : size <= 36 ? 'md' : 'lg'} />
    {label && <span className="sr-only">{label}</span>}
  </span>
);

/* ---------------------------------------------------------------------------
   Progress / threshold meters
   ------------------------------------------------------------------------- */

export type MeterState = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export interface MeterProps {
  value: number | null;
  min?: number;
  max?: number;
  state?: MeterState;
  label?: string;
  valueLabel?: string;
  caption?: React.ReactNode;
}

/** Horizontal meter with an accessible numeric value. `null` renders "no data". */
export const Meter: React.FC<MeterProps> = ({ value, min = 0, max = 100, state = 'ok', label, valueLabel, caption }) => {
  const hasValue = typeof value === 'number' && Number.isFinite(value);
  const pct = hasValue ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <div className="ap-stack ap-stack--tight">
      {(label || valueLabel) && (
        <div className="flex items-center justify-between gap-3">
          {label && <span style={{ color: 'var(--ap-text-muted)', fontSize: 11, fontWeight: 700 }}>{label}</span>}
          <span className="ap-numeric" style={{ color: 'var(--ap-text)', fontSize: 11.5, fontWeight: 800 }}>
            {hasValue ? valueLabel || `${Math.round(value)}` : 'No reading'}
          </span>
        </div>
      )}
      <div
        className="ap-progress"
        role="meter"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={hasValue ? Number(value.toFixed(1)) : undefined}
        aria-valuetext={hasValue ? undefined : 'No reading available'}
        aria-label={label}
      >
        {hasValue && <i className={state === 'ok' ? '' : `is-${state}`} style={{ width: `${pct}%` }} />}
      </div>
      {caption && <span className="ap-help">{caption}</span>}
    </div>
  );
};

/* ---------------------------------------------------------------------------
   Segmented control and tabs
   ------------------------------------------------------------------------- */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="ap-segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export interface TabDefinition {
  id: string;
  label: string;
  content: React.ReactNode;
}

export const Tabs: React.FC<{ tabs: TabDefinition[]; ariaLabel: string; initialId?: string }> = ({
  tabs,
  ariaLabel,
  initialId,
}) => {
  const [active, setActive] = useState(initialId || tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) || tabs[0];

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === current?.id);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setActive(tabs[(index + 1) % tabs.length].id);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setActive(tabs[(index - 1 + tabs.length) % tabs.length].id);
    }
  };

  return (
    <div className="ap-stack">
      <div className="ap-tabs" role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={current?.id === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={current?.id === tab.id ? 0 : -1}
            className="ap-tab"
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current && (
        <div role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`} tabIndex={0}>
          {current.content}
        </div>
      )}
    </div>
  );
};

/* ---------------------------------------------------------------------------
   Key/value specs list
   ------------------------------------------------------------------------- */

export const KeyValueList: React.FC<{ items: { label: string; value: React.ReactNode }[] }> = ({ items }) => (
  <dl className="ap-kv">
    {items.map((item) => (
      <div key={item.label}>
        <dt>{item.label}</dt>
        <dd>{item.value === '' || item.value === undefined || item.value === null ? '—' : item.value}</dd>
      </div>
    ))}
  </dl>
);

/* ---------------------------------------------------------------------------
   Help tooltip (keyboard accessible, no library)
   ------------------------------------------------------------------------- */

export const InfoTip: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={open ? id : undefined}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px] font-bold leading-none opacity-70 hover:opacity-100"
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 z-40 mb-2 w-60 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
          style={{ color: 'var(--ap-text-muted)', fontSize: 11, lineHeight: 1.55, fontWeight: 500 }}
        >
          <strong style={{ display: 'block', color: 'var(--ap-text)', marginBottom: 3 }}>{label}</strong>
          {children}
        </span>
      )}
    </span>
  );
};

/* ---------------------------------------------------------------------------
   Modal dialog with focus management and Escape handling
   ------------------------------------------------------------------------- */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'default' | 'wide';
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, description, children, footer, size = 'default' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusable = node?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = Array.from(
        node.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => element.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ap-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ap-modal"
        style={size === 'wide' ? { width: 'min(960px, 100%)' } : undefined}
      >
        <div className="ap-modal-head">
          <div style={{ minWidth: 0 }}>
            <h2 id={titleId} style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h2>
            {description && <p className="ap-card-desc" style={{ marginTop: 6 }}>{description}</p>}
          </div>
          <button type="button" className="ap-btn ap-btn--ghost ap-btn--sm" onClick={onClose} aria-label="Close dialog">
            <X size={15} />
          </button>
        </div>
        <div className="ap-modal-body">{children}</div>
        {footer && <div className="ap-modal-foot">{footer}</div>}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------
   Accordion (details/summary based, works without JavaScript state)
   ------------------------------------------------------------------------- */

export const Accordion: React.FC<{ question: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  question,
  children,
  defaultOpen = false,
}) => (
  <details className="ap-accordion" open={defaultOpen}>
    <summary>
      <span>{question}</span>
      <ChevronDown size={15} aria-hidden="true" />
    </summary>
    <div className="ap-accordion-body">{children}</div>
  </details>
);

/* ---------------------------------------------------------------------------
   Small helpers
   ------------------------------------------------------------------------- */

/** Stable, memo-friendly filter list helper used by module toolbars. */
export function useFilteredList<T>(items: T[], predicate: (item: T) => boolean, deps: unknown[]): T[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => items.filter(predicate), [items, ...deps]);
}

export const useEscapeKey = (active: boolean, handler: () => void) => {
  const stableHandler = useCallback(handler, [handler]);
  useEffect(() => {
    if (!active) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stableHandler();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [active, stableHandler]);
};
