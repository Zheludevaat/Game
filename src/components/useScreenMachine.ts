import { useCallback, useReducer } from 'react';

export type Screen =
  | 'loading' | 'menu' | 'archetype' | 'game' | 'pause' | 'settings'
  | 'controllerTest' | 'howTo' | 'gameOver' | 'meta' | 'map'
  | 'codex' | 'prologue' | 'epilogue' | 'cinematics'
  | 'tabula' | 'newRunIntro' | 'bossIntro' | 'ending';

/** Map each screen to the set of screens it can transition to. */
const TRANSITIONS: Record<Screen, Screen[]> = {
  loading:         ['menu', 'tabula'],
  tabula:          ['menu'],
  menu:            ['archetype', 'codex', 'cinematics', 'meta', 'settings', 'controllerTest', 'howTo'],
  archetype:       ['menu', 'game', 'newRunIntro'],
  newRunIntro:     ['game'],
  game:            ['pause', 'map', 'gameOver', 'epilogue', 'ending', 'bossIntro'],
  pause:           ['game', 'settings', 'controllerTest'],
  settings:        ['menu', 'game', 'pause', 'controllerTest', 'codex', 'gameOver'],
  controllerTest:  ['menu', 'game', 'pause', 'settings'],
  map:             ['game'],
  gameOver:        ['menu', 'archetype', 'codex'],
  meta:            ['menu'],
  codex:           ['menu', 'gameOver'],
  cinematics:      ['menu'],
  prologue:        ['archetype'],
  epilogue:        ['game', 'menu'],
  bossIntro:       ['game'],
  ending:          ['game', 'menu'],
  howTo:           ['menu'],
};

interface ScreenState {
  current: Screen;
  /** Stack of previous screens for back-navigation (e.g. settings → previous). */
  stack: Screen[];
}

type ScreenAction =
  | { type: 'GO'; screen: Screen }
  | { type: 'BACK' }
  | { type: 'REPLACE'; screen: Screen };

function screenReducer(state: ScreenState, action: ScreenAction): ScreenState {
  switch (action.type) {
    case 'GO': {
      const allowed = TRANSITIONS[state.current];
      if (!allowed?.includes(action.screen)) {
        console.warn(
          `[ScreenMachine] invalid transition: ${state.current} → ${action.screen}. ` +
          `Allowed: [${allowed?.join(', ') ?? 'none'}]`
        );
        return state;
      }
      return { current: action.screen, stack: [...state.stack, state.current] };
    }
    case 'BACK': {
      if (state.stack.length === 0) return state;
      const prev = state.stack[state.stack.length - 1];
      const allowed = TRANSITIONS[state.current];
      if (allowed && !allowed.includes(prev)) {
        // If the direct back isn't allowed, try finding the most recent
        // screen on the stack that IS reachable from current.
        for (let i = state.stack.length - 1; i >= 0; i--) {
          const candidate = state.stack[i];
          if (TRANSITIONS[state.current].includes(candidate)) {
            return { current: candidate, stack: state.stack.slice(0, i) };
          }
        }
        return state;
      }
      return { current: prev, stack: state.stack.slice(0, -1) };
    }
    case 'REPLACE': {
      // Go to a screen without pushing to the back-stack (e.g. tabula on first load).
      const allowed = TRANSITIONS[state.current];
      if (!allowed?.includes(action.screen)) {
        console.warn(
          `[ScreenMachine] invalid replace: ${state.current} → ${action.screen}. ` +
          `Allowed: [${allowed?.join(', ') ?? 'none'}]`
        );
        return state;
      }
      return { ...state, current: action.screen };
    }
  }
}

export function useScreenMachine(initial: Screen) {
  const [state, dispatch] = useReducer(screenReducer, { current: initial, stack: [] });

  const go = useCallback((screen: Screen) => dispatch({ type: 'GO', screen }), []);
  const back = useCallback(() => dispatch({ type: 'BACK' }), []);
  const replace = useCallback((screen: Screen) => dispatch({ type: 'REPLACE', screen }), []);

  return { screen: state.current, go, back, replace };
}
