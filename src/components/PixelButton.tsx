import React from 'react';

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  focused?: boolean;
  style?: React.CSSProperties;
}

export function PixelButton(props: PixelButtonProps): JSX.Element {
  return (
    <button
      className={`pixel-btn${props.focused ? ' is-focused' : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      autoFocus={props.autoFocus}
      style={props.style}
    >
      <span>{props.children}</span>
      {props.badge && <span className="badge">{props.badge}</span>}
    </button>
  );
}
