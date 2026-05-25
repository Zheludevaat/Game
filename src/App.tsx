import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HudSnapshot, GameEngine, RunSummary } from './game/GameEngine';
import { InputManager } from './game/input/InputManager';
import { audio } from './game/systems/AudioSystem';
import {
  loadBestFloor, loadEssence, loadLastArchetype, loadMeta, loadResume, loadSettings,
  resetAllSave, saveBestFloor, saveEssence, saveLastArchetype, saveMeta, saveResume, saveSettings,
} from './game/systems/SaveSystem';
import { LoadingScreen } from './components/LoadingScreen';
import { MainMenu } from './components/MainMenu';
import { ArchetypeSelect } from './components/ArchetypeSelect';
import { HUD } from './components/HUD';
import { PauseMenu } from './components/PauseMenu';
import { SettingsMenu } from './components/SettingsMenu';
import { ControllerTest } from './components/ControllerTest';
import { HowToPlay } from './components/HowToPlay';
import { GameOverScreen } from './components/GameOver';
import { MetaProgression } from './components/MetaProgression';
import { TouchControls } from './components/TouchControls';
import { RotateDeviceOverlay } from './components/RotateDeviceOverlay';
import { ArchetypeId, MetaState, SettingsState } from './game/GameTypes';
import { MapOverlay } from './components/MapOverlay';
import { CodexScreen } from './components/CodexScreen';
import { Prologue } from './components/Prologue';
import { Epilogue } from './components/Epilogue';
import { CODEX } from './game/data/codex';

type Screen =
  | 'loading' | 'menu' | 'archetype' | 'game' | 'pause' | 'settings'
  | 'controllerTest' | 'howTo' | 'gameOver' | 'meta' | 'map'
  | 'codex' | 'prologue' | 'epilogue';

export function App(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputManager | null>(null);

  const [screen, setScreen] = useState<Screen>('loading');
  const [previousScreen, setPreviousScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<SettingsState>(() => loadSettings());
  const [meta, setMeta] = useState<MetaState>(() => loadMeta());
  const [essence, setEssence] = useState<number>(() => loadEssence());
  const [bestFloor, setBestFloor] = useState<number>(() => loadBestFloor());
  const [lastArchetype, setLastArchetype] = useState<ArchetypeId | null>(() => loadLastArchetype());

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [resumeAvailable, setResumeAvailable] = useState<boolean>(() => !!loadResume());
  const [isTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches
      || ('ontouchstart' in window);
  });

  // --- Loading screen timer ---
  useEffect(() => {
    const t = setTimeout(() => setScreen('menu'), 1400);
    return () => clearTimeout(t);
  }, []);

  // --- Persist settings ---
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { audio.setMusicVolume(settings.musicVolume); }, [settings.musicVolume]);
  useEffect(() => { audio.setSfxVolume(settings.sfxVolume); }, [settings.sfxVolume]);
  useEffect(() => { saveMeta(meta); }, [meta]);
  useEffect(() => { saveEssence(essence); }, [essence]);
  useEffect(() => { saveBestFloor(bestFloor); }, [bestFloor]);

  // --- Audio unlock ---
  useEffect(() => {
    const unlock = (): void => {
      audio.unlock();
      audio.setMusicVolume(settings.musicVolume);
      audio.setSfxVolume(settings.sfxVolume);
      if (screen === 'menu' || screen === 'archetype' || screen === 'meta' || screen === 'howTo' || screen === 'settings' || screen === 'controllerTest') {
        audio.playMenuHum();
      }
    };
    const handler = (): void => { unlock(); window.removeEventListener('pointerdown', handler); window.removeEventListener('keydown', handler); window.removeEventListener('gamepadconnected', handler); };
    window.addEventListener('pointerdown', handler);
    window.addEventListener('keydown', handler);
    window.addEventListener('gamepadconnected', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      window.removeEventListener('gamepadconnected', handler);
    };
  }, [screen, settings.musicVolume, settings.sfxVolume]);

  // --- Orientation detection ---
  useEffect(() => {
    const update = (): void => {
      const portrait = window.matchMedia('(orientation: portrait)').matches
        && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      setIsPortrait(portrait);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // --- Canvas DPR resize ---
  useEffect(() => {
    const onResize = (): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [screen]);

  const startRun = useCallback((archetypeId: ArchetypeId, opts?: { floor?: number; runSeed?: number }) => {
    saveLastArchetype(archetypeId);
    setLastArchetype(archetypeId);
    setSummary(null);
    setScreen('game');
    // Persist a resume entry — used by Continue button next time
    const runSeed = opts?.runSeed ?? Math.floor(Math.random() * 0xffffffff);
    const startingFloor = opts?.floor ?? 1;
    saveResume({ archetype: archetypeId, floor: startingFloor, seed: runSeed });
    setResumeAvailable(true);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const input = new InputManager();
      inputRef.current = input;
      const engine = new GameEngine({
        onHud: setHud,
        onPause: () => setScreen('pause'),
        onOpenMap: () => { setPreviousScreen('game'); setScreen('map'); },
        onGameOver: (s) => {
          setSummary(s);
          setBestFloor((b) => {
            const nb = Math.max(b, s.floorReached);
            saveBestFloor(nb);
            return nb;
          });
          setEssence((e) => { const ne = e + s.essenceCollected; saveEssence(ne); return ne; });
          saveResume(null);
          setResumeAvailable(false);
          setScreen('gameOver');
        },
        onFloorChange: (n) => {
          // Update resume floor checkpoint
          saveResume({ archetype: archetypeId, floor: n, seed: runSeed });
        },
        onCodexUnlock: (id) => {
          setMeta((m) => {
            if (m.unlockedCodex.includes(id)) return m;
            return { ...m, unlockedCodex: [...m.unlockedCodex, id] };
          });
        },
        onOgdoadReached: () => {
          setMeta((m) => ({ ...m, ogdoadReached: (m.ogdoadReached ?? 0) + 1 }));
          // Pause the run and show the climactic epilogue. The player can
          // continue descending after dismissing it.
          setPreviousScreen('game');
          setScreen('epilogue');
        },
      });
      engineRef.current = engine;
      audio.unlock();
      audio.stopMenuHum();
      engine.mount(canvas, input, {
        archetypeId,
        meta,
        reducedParticles: settings.reducedParticles,
        startingFloor,
        runSeed,
      });
    }, 30);
  }, [meta, settings.reducedParticles]);

  const stopRun = useCallback(() => {
    const engine = engineRef.current;
    if (engine) engine.unmount();
    engineRef.current = null;
    inputRef.current = null;
    setHud(null);
  }, []);

  // Pause behaviour
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setPaused(
      screen === 'pause' || screen === 'settings' || screen === 'controllerTest'
      || screen === 'map' || screen === 'gameOver'
      || screen === 'codex' || screen === 'epilogue'
    );
  }, [screen]);

  // Reduced particles toggle should propagate live
  useEffect(() => {
    engineRef.current?.setReducedParticles(settings.reducedParticles);
  }, [settings.reducedParticles]);

  const onResetSave = useCallback(() => {
    resetAllSave();
    setSettings(loadSettings());
    setMeta(loadMeta());
    setEssence(loadEssence());
    setBestFloor(loadBestFloor());
    setLastArchetype(null);
    setResumeAvailable(false);
  }, []);

  const onSpendMeta = useCallback((key: keyof MetaState, cost: number, applyDelta: (m: MetaState) => MetaState) => {
    if (essence < cost) return;
    setEssence((e) => { const ne = e - cost; saveEssence(ne); return ne; });
    setMeta((m) => {
      const next = applyDelta(m);
      saveMeta(next);
      return next;
    });
    void key;
  }, [essence]);

  // Render canvas always when game is active
  const showCanvas = useMemo(() => (
    screen === 'game' || screen === 'pause' || screen === 'map' ||
    screen === 'settings' || screen === 'controllerTest'
  ), [screen]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: showCanvas ? 'block' : 'none',
        }}
      />
      {screen === 'loading' && <LoadingScreen />}

      {screen === 'menu' && (
        <MainMenu
          bestFloor={bestFloor}
          essence={essence}
          resumeAvailable={resumeAvailable}
          codexUnlocked={meta.unlockedCodex.length}
          codexTotal={CODEX.length}
          onCodex={() => { setPreviousScreen('menu'); setScreen('codex'); }}
          onNewRun={() => {
            if (!meta.seenPrologue) {
              setScreen('prologue');
            } else {
              setScreen('archetype');
            }
          }}
          onContinue={() => {
            const r = loadResume();
            if (!r) { setScreen('archetype'); return; }
            startRun(r.archetype, { floor: r.floor, runSeed: r.seed });
          }}
          onMeta={() => setScreen('meta')}
          onSettings={() => { setPreviousScreen('menu'); setScreen('settings'); }}
          onController={() => { setPreviousScreen('menu'); setScreen('controllerTest'); }}
          onHowTo={() => setScreen('howTo')}
        />
      )}

      {screen === 'archetype' && (
        <ArchetypeSelect
          lastArchetype={lastArchetype}
          onSelect={(id) => startRun(id)}
          onBack={() => setScreen('menu')}
        />
      )}

      {showCanvas && hud && (
        <HUD hud={hud} />
      )}

      {screen === 'game' && settings.touchControls && inputRef.current && hud &&
        (hud.inputMethod === 'touch' || (isTouchDevice && hud.inputMethod !== 'controller')) && (
        <TouchControls input={inputRef.current} />
      )}

      {screen === 'pause' && (
        <PauseMenu
          onResume={() => setScreen('game')}
          onSettings={() => { setPreviousScreen('pause'); setScreen('settings'); }}
          onController={() => { setPreviousScreen('pause'); setScreen('controllerTest'); }}
          onQuit={() => {
            stopRun();
            saveResume(null);
            setResumeAvailable(false);
            setScreen('menu');
          }}
        />
      )}

      {screen === 'map' && hud && (
        <MapOverlay hud={hud} onClose={() => setScreen('game')} />
      )}

      {screen === 'settings' && (
        <SettingsMenu
          settings={settings}
          onChange={setSettings}
          onResetSave={onResetSave}
          onBack={() => setScreen(previousScreen)}
        />
      )}

      {screen === 'controllerTest' && (
        <ControllerTest
          input={inputRef.current}
          onBack={() => setScreen(previousScreen)}
        />
      )}

      {screen === 'howTo' && (
        <HowToPlay onBack={() => setScreen('menu')} />
      )}

      {screen === 'gameOver' && summary && (
        <GameOverScreen
          summary={summary}
          bestFloor={bestFloor}
          essenceTotal={essence}
          onNewRun={() => {
            stopRun();
            setScreen('archetype');
          }}
          onCodex={() => { setPreviousScreen('gameOver'); setScreen('codex'); }}
          onMenu={() => {
            stopRun();
            setScreen('menu');
          }}
        />
      )}

      {screen === 'meta' && (
        <MetaProgression
          essence={essence}
          meta={meta}
          onSpend={onSpendMeta}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'codex' && (
        <CodexScreen
          unlocked={meta.unlockedCodex}
          newIds={summary?.codexUnlockedThisRun ?? []}
          onBack={() => setScreen(previousScreen === 'gameOver' ? 'gameOver' : 'menu')}
        />
      )}

      {screen === 'prologue' && (
        <Prologue
          onContinue={() => {
            setMeta((m) => ({ ...m, seenPrologue: true }));
            setScreen('archetype');
          }}
          onSkip={() => {
            setMeta((m) => ({ ...m, seenPrologue: true }));
            setScreen('archetype');
          }}
        />
      )}

      {screen === 'epilogue' && (
        <Epilogue
          ogdoadCount={meta.ogdoadReached || 1}
          onContinue={() => setScreen(previousScreen === 'game' ? 'game' : 'menu')}
        />
      )}

      {isPortrait && <RotateDeviceOverlay />}
    </>
  );
}
