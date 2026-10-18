import React from 'react';
import './AgriPulseLoader.css';

export type AgriPulseLoaderSize = 'sm' | 'md' | 'lg';
export type AgriPulseLoaderVariant = 'inline' | 'panel';

export interface AgriPulseLoaderProps {
  /** Compact button/status loader, normal inline loader, or full-width loading panel. */
  variant?: AgriPulseLoaderVariant;
  size?: AgriPulseLoaderSize;
  /** Visible and announced status text. Omit when adjacent button text already describes the action. */
  label?: string;
  className?: string;
}

/** Agriculture-themed loading indicator: an orbiting field ring around a growing sprout. */
export const AgriPulseLoader: React.FC<AgriPulseLoaderProps> = ({
  variant = 'inline',
  size = 'md',
  label,
  className = '',
}) => (
  <span
    className={[
      'agri-loader',
      `agri-loader--${size}`,
      variant === 'panel' ? 'agri-loader--panel' : '',
      className,
    ].filter(Boolean).join(' ')}
    role={label ? 'status' : undefined}
    aria-live={label ? 'polite' : undefined}
    aria-hidden={!label ? true : undefined}
  >
    <svg className="agri-loader__art" viewBox="0 0 48 48" focusable="false" aria-hidden="true">
      <circle className="agri-loader__track" cx="24" cy="24" r="19" />
      <g className="agri-loader__orbit">
        <circle className="agri-loader__orbit-stroke" cx="24" cy="24" r="19" />
      </g>
      <path className="agri-loader__soil" d="M13.5 37.5c3.3-1.2 6.9-.8 10.5 0 3.6.8 7.2 1.2 10.5 0" />
      <path className="agri-loader__stem" d="M24 36.5c.1-5.7-.3-10.9.3-16.4.3-2.6 1.4-4.7 3.2-6.7" />
      <g className="agri-loader__leaf agri-loader__leaf--left">
        <path d="M23.5 25.7c-5.1-7.5-10.8-8.8-13-6.4.1 5.7 5.3 9.5 13.1 8.1z" />
        <path className="agri-loader__vein" d="M12.8 20.2c3.3 2 6.8 4.2 10.8 6.6" />
      </g>
      <g className="agri-loader__leaf agri-loader__leaf--right">
        <path d="M26.2 20.7c1.6-7.4 6.4-10.7 10-9.1 1.2 5.5-2.7 10.5-10.7 11.2z" />
        <path className="agri-loader__vein" d="M35.3 13.5c-2.5 2.6-5.4 5.6-9.2 8.6" />
      </g>
    </svg>
    {label && <span className="agri-loader__label">{label}</span>}
  </span>
);
