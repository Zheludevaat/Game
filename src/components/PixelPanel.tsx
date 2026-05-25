import React from 'react';

interface PixelPanelProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  width?: number | string;
  style?: React.CSSProperties;
}

export function PixelPanel({ children, title, subtitle, width, style }: PixelPanelProps): JSX.Element {
  return (
    <div className="pixel-panel" style={{ width: width ?? 'auto', maxWidth: 'calc(100vw - 64px)', ...style }}>
      {(title || subtitle) && (
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          {subtitle && <div className="pixel-subtitle">{subtitle}</div>}
          {title && <h2 className="pixel-title" style={{ fontSize: 24, margin: 4 }}>{title}</h2>}
          <div className="pixel-divider" />
        </div>
      )}
      {children}
    </div>
  );
}
