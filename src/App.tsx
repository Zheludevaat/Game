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
import { ArchetypeId, MetaState, RunHistoryEntry, SettingsState } from './game/GameTypes';
import { evaluateAchievements } from './game/data/achievements';
import { MapOverlay } from './components/MapOverlay';
import { CodexScreen } from './components/CodexScreen';
import { CinematicsScreen } from './components/CinematicsScreen';
import { Prologue } from './components/Prologue';
import { Epilogue } from './components/Epilogue';
import { CinematicShort } from './components/CinematicShort';
import { CODEX } from './game/data/codex';
import { TABULA_CINEMATIC } from './game/data/cinematicTabula';
import { NEW_GAME_CINEMATIC } from './game/data/cinematicNewGame';
import { bossIntroShots } from './game/data/cinematicBossIntro';
import { ENDING_CINEMATIC } from './game/data/cinematicEnding';
import { SPHERE_BY_ID, SphereId } from './game/data/spheres';

type Screen =
  | 'loading' | 'menu' | 'archetype' | 'game' | 'pause' | 'settings'
  | 'controllerTest' | 'howTo' | 'gameOver' | 'meta' | 'map'
  | 'codex' | 'prologue' | 'epilogue' | 'cinematics'
  | 'tabula'        // opening film (replaces card Prologue as default)
  | 'newRunIntro'   // "The Gate Opens" between archetype select and game
  | 'bossIntro'     // sphere-specific Warden manifest film
  | 'ending';       // "The Eighth Sphere" climactic ending film

export function App(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputManager | null>(null);

  const [screen, setScreen] = useState<Screen>('loading');
  const [previousScreen, setPreviousScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<SettingsState>(() => loadSettings());
  // Settings ref — always points at the latest settings object so the
  // InputManager's mapping provider can read settings.gamepadMap on
  // every tick without depending on React render timing.
  const settingsRef = useRef<SettingsState>(settings);
  settingsRef.current = settings;
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
  // Which Warden's intro film is queued, if any. App routes to 'bossIntro'
  // when this is set, then back to 'game' on completion.
  const [pendingBossIntro, setPendingBossIntro] = useState<string | null>(null);
  // Archetype + run options stashed when a new-run cinematic is queued.
  const [pendingRunStart, setPendingRunStart] = useState<{ id: ArchetypeId; floor?: number; runSeed?: number } | null>(null);

  // --- Loading screen timer ---
  // First-load goes through the Tabula opening film instead of straight to
  // the menu. Subsequent loads (after the player has seen it once) skip
  // ahead. The film is replayable from the Cinematics gallery.
  useEffect(() => {
    const t = setTimeout(() => {
      setScreen(meta.seenPrologue ? 'menu' : 'tabula');
    }, 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Persist settings ---
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { audio.setMusicVolume(settings.musicVolume); }, [settings.musicVolume]);
  useEffect(() => { audio.setSfxVolume(settings.sfxVolume); }, [settings.sfxVolume]);
  // Keep the InputManager's gamepad mapping in sync with the SettingsMenu —
  // otherwise the remap UI changes nothing.
  useEffect(() => {
    inputRef.current?.setMapping(settings.gamepadMap);
  }, [settings.gamepadMap]);
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
    // iOS Safari fires this when the URL bar slides — without it the
    // canvas keeps its old dimensions and the game shrinks/clips.
    window.visualViewport?.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('scroll', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('scroll', onResize);
    };
  }, [screen]);

  const startRun = useCallback((archetypeId: ArchetypeId, opts?: { floor?: number; runSeed?: number }) => {
    saveLastArchetype(archetypeId);
    setLastArchetype(archetypeId);
    setSummary(null);
    // First time ever: gate through "The Gate Opens" cinematic, then
    // resume into the actual run on its onDone. Resume flow (opts.floor
    // > 1) skips the cinematic — that's a continuation, not a new run.
    const isFirstRun = !meta.seenNewRunCinematic && (opts?.floor ?? 1) === 1;
    if (isFirstRun) {
      setPendingRunStart({ id: archetypeId, floor: opts?.floor, runSeed: opts?.runSeed });
      setScreen('newRunIntro');
      return;
    }
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
      // Wire the live mapping source — InputManager will read
      // settings.gamepadMap on EVERY tick via this provider, so the
      // in-game bindings can never diverge from what the SettingsMenu
      // and Controller Test display. No more stale-localStorage cache.
      input.setMappingProvider(() => settingsRef.current.gamepadMap);
      // When the auto-Switch preset fires (Switch controller connects
      // while the user is still on Xbox defaults), push the swap into
      // settings so all three views stay in sync.
      input.setAutoPresetCallback((m) => {
        setSettings((s) => ({ ...s, gamepadMap: { ...m } }));
      });
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
          // Append the run to history, update per-archetype best, evaluate
          // achievements. setMeta then auto-persists via the existing useEffect.
          setMeta((m) => {
            const entry: RunHistoryEntry = {
              date: Date.now(),
              archetype: archetypeId,
              floorReached: s.floorReached,
              bossesDefeated: s.bossesDefeated,
              essenceCollected: s.essenceCollected,
              ascensionLevel: m.ascensionLevel ?? 0,
              deathCause: s.ogdoadReached ? 'descend' : undefined,
            };
            const history = [entry, ...(m.runHistory ?? [])].slice(0, 20);
            const pab = { ...(m.perArchetypeBest ?? {}) };
            pab[archetypeId] = Math.max(pab[archetypeId] ?? 0, s.floorReached);
            const newAchievements = evaluateAchievements(s, { ...m, perArchetypeBest: pab }, m.ascensionLevel ?? 0);
            const achievements = [...(m.achievements ?? []), ...newAchievements];
            return { ...m, runHistory: history, perArchetypeBest: pab, achievements };
          });
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
          // First time reaching the Ogdoad: the climactic Ending film.
          // Subsequent times (replays of the same achievement): the card
          // Epilogue, which is shorter and resumable.
          setPreviousScreen('game');
          setScreen(meta.seenEnding ? 'epilogue' : 'ending');
        },
        onBossRoomEntered: (sphereId: string) => {
          // Already seen this sphere's intro across runs? skip.
          if (meta.bossesSeen?.includes(sphereId)) return;
          setPendingBossIntro(sphereId);
          setPreviousScreen('game');
          setScreen('bossIntro');
        },
        onTutorialComplete: () => {
          setMeta((m) => ({ ...m, seenTutorial: true }));
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
      || screen === 'codex' || screen === 'epilogue' || screen === 'cinematics'
      || screen === 'tabula' || screen === 'newRunIntro' || screen === 'bossIntro'
      || screen === 'ending'
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
          onCinematics={() => setScreen('cinematics')}
          onNewRun={() => setScreen('archetype')}
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
        <HUD hud={hud} input={inputRef.current} />
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
          onResetPad={() => inputRef.current?.resetMapping()}
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
          onSetAscension={(level) => setMeta((m) => ({ ...m, ascensionLevel: level }))}
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

      {screen === 'cinematics' && (
        <CinematicsScreen onBack={() => setScreen('menu')} endingUnlocked={meta.seenEnding} />
      )}

      {screen === 'tabula' && (
        <CinematicShort
          shots={TABULA_CINEMATIC}
          title="I — OPENING"
          mood="cosmos"
          onDone={() => {
            setMeta((m) => ({ ...m, seenPrologue: true }));
            setScreen('menu');
          }}
        />
      )}

      {screen === 'ending' && (
        <CinematicShort
          shots={ENDING_CINEMATIC}
          title="VIII — THE OGDOAD"
          mood="ascent"
          onDone={() => {
            setMeta((m) => ({ ...m, seenEnding: true }));
            setScreen(previousScreen === 'game' ? 'game' : 'menu');
          }}
        />
      )}

      {screen === 'newRunIntro' && pendingRunStart && (
        <CinematicShort
          shots={NEW_GAME_CINEMATIC}
          title="II — THE DESCENT BEGINS"
          mood="descent"
          onDone={() => {
            setMeta((m) => ({ ...m, seenNewRunCinematic: true }));
            const run = pendingRunStart;
            setPendingRunStart(null);
            startRun(run.id, { floor: run.floor, runSeed: run.runSeed });
          }}
        />
      )}

      {screen === 'bossIntro' && pendingBossIntro && (() => {
        const sphereId = pendingBossIntro as SphereId;
        const sphere = SPHERE_BY_ID[sphereId];
        return (
          <CinematicShort
            shots={bossIntroShots(sphereId)}
            title={`${sphere.numeral} — ${sphere.name.toUpperCase()}`}
            mood="boss"
            onDone={() => {
              setPendingBossIntro(null);
              setMeta((m) => ({
                ...m,
                bossesSeen: m.bossesSeen?.includes(sphereId) ? m.bossesSeen : [...(m.bossesSeen ?? []), sphereId],
              }));
              setScreen('game');
            }}
          />
        );
      })()}

      {isPortrait && <RotateDeviceOverlay />}
    </>
  );
}
