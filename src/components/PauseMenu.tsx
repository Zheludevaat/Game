import { PixelButton } from './PixelButton';
import { PixelPanel } from './PixelPanel';
import { useMenuNav } from './useMenuNav';

interface Props {
  onResume: () => void;
  onSettings: () => void;
  onController: () => void;
  onQuit: () => void;
}

export function PauseMenu(p: Props): JSX.Element {
  const items = [
    { onActivate: p.onResume },
    { onActivate: p.onSettings },
    { onActivate: p.onController },
    { onActivate: p.onQuit },
  ];
  const focus = useMenuNav(items, { onCancel: p.onResume });
  return (
    <div className="menu-screen with-bg">
      <PixelPanel title="Paused" subtitle="A breath between trials" width={360}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PixelButton onClick={p.onResume} focused={focus === 0}>Resume</PixelButton>
          <PixelButton onClick={p.onSettings} focused={focus === 1}>Settings</PixelButton>
          <PixelButton onClick={p.onController} focused={focus === 2}>Controller Test</PixelButton>
          <PixelButton onClick={p.onQuit} focused={focus === 3}>Quit to Main Menu</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
