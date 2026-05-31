import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HudSnapshot, GameEngine, RunSummary } from './game/GameEngine';
import { InputManager } from './game/input/InputManager';
import { audio } from './game/systems/AudioSystem';
import {
  loadBestFloor, loadEssence, loadLastArchetype, loadMeta, loadResume, loadSettings,
  loadRunSnapshot, saveRunSnapshot, clearRunSnapshot,
  resetAllSave, saveBestFloor, saveEssence, saveLastArchetype, saveMeta, saveResume, saveSettings,
} from './game/systems/SaveSystem';
import { RunSnapshot } from './game/systems/runSnapshot';
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
import { ActiveDialogueState, ArchetypeId, DebugSnapshot, MetaState, SettingsState } from './game/GameTypes';
import { MapOverlay } from './components/MapOverlay';
import { CodexScreen } from './components/CodexScreen';
import { CinematicsScreen } from './components/CinematicsScreen';
import { Prologue } from './components/Prologue';
import { Epilogue } from './components/Epilogue';
import { CinematicShort } from './components/CinematicShort';
import { DebugOverlay } from './components/DebugOverlay';
import { DialoguePanel } from './components/DialoguePanel';
import { getDialogueView } from './game/systems/dialogue';
import { NPC_BY_ID } from './game/data/npcs';
import { CODEX } from './game/data/codex';
import { TABULA_CINEMATIC } from './game/data/cinematicTabula';
import { NEW_GAME_CINEMATIC } from './game/data/cinematicNewGame';
import { bossIntroShots } from './game/data/cinematicBossIntro';
import { ENDING_CINEMATIC } from './game/data/cinematicEnding';
import { SPHERE_BY_ID, SphereId } from './game/data/spheres';

import { useScreenMachine, Screen } from './components/useScreenMachine';

export function App(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<InputManager | null>(null);

  const { screen, go, back, replace } = useScreenMachine('loading');
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
  const [debugVisible, setDebugVisible] = useState<boolean>(false);
  const [debugSnapshot, setDebugSnapshot] = useState<DebugSnapshot | null>(null);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [resumeAvailable, setResumeAvailable] = useState<boolean>(() => !!loadResume() || !!loadRunSnapshot());
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
  // Active NPC dialogue state, if any.
  const [dialogue, setDialogue] = useState<ActiveDialogueState | null>(null);

  // --- Loading screen timer ---
  // First-load goes through the Tabula opening film instead of straight to
  // the menu. Subsequent loads (after the player has seen it once) skip
  // ahead. The film is replayable from the Cinematics gallery.
  useEffect(() => {
    const t = setTimeout(() => {
      replace(meta.seenPrologue ? 'menu' : 'tabula');
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
      if (screen === 'tabula' || screen === 'menu' || screen === 'archetype' || screen === 'meta' || screen === 'howTo' || screen === 'settings' || screen === 'controllerTest') {
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

  // --- Screen-based music ---
  useEffect(() => {
    switch (screen) {
      case 'gameOver':
        audio.playGameOverMusic();
        break;
      case 'prologue':
        audio.playPrologueMusic();
        break;
      case 'epilogue':
        audio.playEpilogueMusic();
        break;
      case 'codex':
        audio.playCodexMusic();
        break;
      default: {
        audio.stopGameOverMusic();
        audio.stopPrologueMusic();
        audio.stopEpilogueMusic();
        audio.stopCodexMusic();
        // Restart menu hum when navigating back to a menu-like screen
        if (screen === 'tabula' || screen === 'menu' || screen === 'archetype' || screen === 'meta' || screen === 'howTo' || screen === 'settings' || screen === 'controllerTest' || screen === 'cinematics') {
          audio.sfx('menu');
          audio.playMenuHum();
        }
        break;
      }
    }
  }, [screen]);

  // --- Pause music ducking ---
  useEffect(() => {
    if (screen === 'pause') {
      audio.duckMusic();
    } else {
      audio.unduckMusic();
    }
  }, [screen]);

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

  const startRun = useCallback((archetypeId: ArchetypeId, opts?: { floor?: number; runSeed?: number; resumeSnapshot?: RunSnapshot }) => {
    saveLastArchetype(archetypeId);
    setLastArchetype(archetypeId);
    setSummary(null);
    // Clear any existing snapshot so stale data doesn't linger.
    // When resuming, the caller passes resumeSnapshot so this clear
    // removes any older snapshot before the engine writes a fresh one.
    clearRunSnapshot();
    // First time ever: gate through "The Gate Opens" cinematic, then
    // resume into the actual run on its onDone. Resume flow (opts.floor
    // > 1) skips the cinematic — that's a continuation, not a new run.
    const isFirstRun = !meta.seenNewRunCinematic && !opts?.resumeSnapshot && (opts?.floor ?? 1) === 1;
    if (isFirstRun) {
      setPendingRunStart({ id: archetypeId, floor: opts?.floor, runSeed: opts?.runSeed });
      go('newRunIntro');
      return;
    }
    go('game');
    // Persist a resume entry — used by Continue button next time
    const runSeed = opts?.runSeed ?? Math.floor(Math.random() * 0xffffffff);
    const startingFloor = opts?.floor ?? 1;
    // Only save the old-format resume for non-snapshot starts (fresh runs)
    // so the Continue button can fall back if the snapshot is missing.
    if (!opts?.resumeSnapshot) {
      saveResume({ archetype: archetypeId, floor: startingFloor, seed: runSeed });
      setResumeAvailable(true);
    }
    // Wait for React to flush the canvas to the DOM, then mount the engine.
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn('[startRun] canvas not available after rAF — mounting skipped');
        return;
      }
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
        onPause: () => go('pause'),
        onOpenMap: () => go('map'),
        onGameOver: (s) => {
          setSummary(s);
          setBestFloor((b) => {
            const nb = Math.max(b, s.floorReached);
            saveBestFloor(nb);
            return nb;
          });
          setEssence((e) => { const ne = e + s.essenceCollected; saveEssence(ne); return ne; });
          saveResume(null);
          clearRunSnapshot();
          setResumeAvailable(false);
          go('gameOver');
        },
        onFloorChange: (n) => {
          // Update resume floor checkpoint (old-format fallback)
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
          go(meta.seenEnding ? 'epilogue' : 'ending');
        },
        onBossRoomEntered: (sphereId: string) => {
          // Already seen this sphere's intro across runs? skip.
          if (meta.bossesSeen?.includes(sphereId)) return;
          setPendingBossIntro(sphereId);
          go('bossIntro');
        },
        onDialogueOpen: (d) => setDialogue(d),
        onDialogueClose: () => setDialogue(null),
        onAutoSave: (snapshot) => saveRunSnapshot(snapshot),
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
        resumeSnapshot: opts?.resumeSnapshot,
      });
    });
  }, [meta, settings.reducedParticles, go]);

  const stopRun = useCallback(() => {
    const engine = engineRef.current;
    if (engine) engine.unmount();
    engineRef.current = null;
    inputRef.current = null;
    setHud(null);
    audio.stopAmbience();
    audio.stopBossMusic();
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

  // Pause on blur — when the player switches tabs / apps / the iPad locks,
  // the game freezes so they don't die while away.
  useEffect(() => {
    const onBlur = (): void => {
      const engine = engineRef.current;
      if (engine && !engine.isDead()) engine.setPaused(true);
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  // Debug overlay toggle (Shift+Backquote)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.shiftKey && e.code === 'Backquote' && !e.repeat) {
        setDebugVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Poll debug snapshot from engine + audio when overlay is visible
  useEffect(() => {
    if (!debugVisible) return;
    const id = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const snap = engine.getDebugSnapshot();
      const diag = audio.getDiagnostics();
      snap.audio = {
        activeCue: diag.activeCue,
        clipping: diag.clipping,
        activeNodeCount: diag.activeNodeCount,
      };
      setDebugSnapshot(snap);
    }, 200);
    return () => { clearInterval(id); setDebugSnapshot(null); };
  }, [debugVisible]);

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
      <DebugOverlay snapshot={debugVisible ? debugSnapshot : null} />
      {screen === 'loading' && <LoadingScreen />}

      {screen === 'menu' && (
        <MainMenu
          bestFloor={bestFloor}
          essence={essence}
          resumeAvailable={resumeAvailable}
          codexUnlocked={meta.unlockedCodex.length}
          codexTotal={CODEX.length}
          onCodex={() => go('codex')}
          onCinematics={() => go('cinematics')}
          onNewRun={() => go('archetype')}
          onContinue={() => {
            const snapshot = loadRunSnapshot();
            if (snapshot) {
              startRun(snapshot.archetype, {
                floor: snapshot.floor,
                runSeed: snapshot.runSeed,
                resumeSnapshot: snapshot,
              });
              return;
            }
            const r = loadResume();
            if (!r) { go('archetype'); return; }
            startRun(r.archetype, { floor: r.floor, runSeed: r.seed });
          }}
          onMeta={() => go('meta')}
          onSettings={() => go('settings')}
          onController={() => go('controllerTest')}
          onHowTo={() => go('howTo')}
        />
      )}

      {screen === 'archetype' && (
        <ArchetypeSelect
          lastArchetype={lastArchetype}
          onSelect={(id) => startRun(id)}
          onBack={() => go('menu')}
        />
      )}

      {showCanvas && hud && (
        <HUD hud={hud} input={inputRef.current} />
      )}

      {screen === 'game' && settings.touchControls && inputRef.current && hud &&
        (hud.inputMethod === 'touch' || (isTouchDevice && hud.inputMethod !== 'controller')) && (
        <TouchControls input={inputRef.current} />
      )}

      {screen === 'game' && dialogue && (() => {
        const npcDef = NPC_BY_ID[dialogue.npcId];
        if (!npcDef || !npcDef.dialogue) return null;
        const view = getDialogueView(npcDef, dialogue.lineIndex);
        if (!view) return null;
        return (
          <DialoguePanel
            speaker={view.speaker}
            text={view.text}
            onAdvance={() => engineRef.current?.advanceDialogue()}
            choices={view.choices.map((c, i) => ({
              label: c.label,
              cost: c.cost,
              onChoose: () => engineRef.current?.chooseDialogueOption(i),
            }))}
          />
        );
      })()}

      {screen === 'pause' && (
        <PauseMenu
          onResume={() => go('game')}
          onSettings={() => go('settings')}
          onController={() => go('controllerTest')}
          onQuit={() => {
            stopRun();
            saveResume(null);
            clearRunSnapshot();
            setResumeAvailable(false);
            go('menu');
          }}
        />
      )}

      {screen === 'map' && hud && (
        <MapOverlay hud={hud} onClose={() => go('game')} />
      )}

      {screen === 'settings' && (
        <SettingsMenu
          settings={settings}
          onChange={setSettings}
          onResetSave={onResetSave}
          onResetPad={() => inputRef.current?.resetMapping()}
          onBack={() => back()}
        />
      )}

      {screen === 'controllerTest' && (
        <ControllerTest
          input={inputRef.current}
          onBack={() => back()}
        />
      )}

      {screen === 'howTo' && (
        <HowToPlay onBack={() => go('menu')} />
      )}

      {screen === 'gameOver' && summary && (
        <GameOverScreen
          summary={summary}
          bestFloor={bestFloor}
          essenceTotal={essence}
          onNewRun={() => {
            stopRun();
            go('archetype');
          }}
          onCodex={() => go('codex')}
          onMenu={() => {
            stopRun();
            go('menu');
          }}
        />
      )}

      {screen === 'meta' && (
        <MetaProgression
          essence={essence}
          meta={meta}
          onSpend={onSpendMeta}
          onBack={() => go('menu')}
        />
      )}

      {screen === 'codex' && (
        <CodexScreen
          unlocked={meta.unlockedCodex}
          newIds={summary?.codexUnlockedThisRun ?? []}
          onBack={() => back()}
        />
      )}

      {screen === 'prologue' && (
        <Prologue
          onContinue={() => {
            setMeta((m) => ({ ...m, seenPrologue: true }));
            go('archetype');
          }}
          onSkip={() => {
            setMeta((m) => ({ ...m, seenPrologue: true }));
            go('archetype');
          }}
        />
      )}

      {screen === 'epilogue' && (
        <Epilogue
          ogdoadCount={meta.ogdoadReached || 1}
          onContinue={() => back()}
        />
      )}

      {screen === 'cinematics' && (
        <CinematicsScreen onBack={() => go('menu')} endingUnlocked={meta.seenEnding} />
      )}

      {screen === 'tabula' && (
        <CinematicShort
          shots={TABULA_CINEMATIC}
          title="I — OPENING"
          mood="cosmos"
          onDone={() => {
            setMeta((m) => ({ ...m, seenPrologue: true }));
            go('menu');
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
            back();
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
              go('game');
            }}
          />
        );
      })()}

      {isPortrait && screen === 'game' && <RotateDeviceOverlay />}
    </>
  );
}
