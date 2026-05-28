import { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

const STORAGE_KEYS = {
  settings: 'sl.settings',
  best: 'sl.best',
  essence: 'sl.essence',
  meta: 'sl.meta',
  lastArchetype: 'sl.lastArchetype',
  gamepadMap: 'sl.gamepadMap',
  resume: 'sl.resume',
} as const;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleResetSave = (): void => {
    for (const k of Object.values(STORAGE_KEYS)) {
      try { localStorage.removeItem(k); } catch { /* */ }
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16,
        background: '#05020d', color: '#e7e3d7',
        fontFamily: '"Iowan Old Style", "Georgia", serif',
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8, opacity: 0.6 }}>△</div>
        <h1 style={{ fontSize: 20, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f4d27a' }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: 480, lineHeight: 1.6, opacity: 0.8, margin: 0 }}>
          The Abyss has encountered an error. Your save data is preserved.
        </p>
        <pre style={{ fontSize: 11, opacity: 0.5, maxWidth: 480, overflow: 'auto' }}>
          {this.state.error?.message}
        </pre>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={this.handleReset} style={btnStyle}>
            Try Again
          </button>
          <button onClick={this.handleResetSave} style={{ ...btnStyle, borderColor: '#e23a4a', color: '#e23a4a' }}>
            Reset Save &amp; Reload
          </button>
        </div>
      </div>
    );
  }
}

const btnStyle: React.CSSProperties = {
  padding: '10px 24px', border: '2px solid #c8983f',
  background: 'rgba(20,12,38,0.85)', color: '#f4d27a',
  fontFamily: 'inherit', fontSize: 12, letterSpacing: '0.2em',
  textTransform: 'uppercase', cursor: 'pointer',
};
