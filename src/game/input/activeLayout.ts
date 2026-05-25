// Cheap, allocation-free helper that returns the current controller
// layout based on whichever gamepad is connected. Used by the React menu
// hooks (useMenuNav, useGamepadButtons) so face buttons obey the player's
// physical "A means confirm" expectations on both Xbox and Switch.
//
// We cache by gamepad.id and re-evaluate only when it changes.

import {
  ControllerLayout,
  confirmButtonIdx,
  cancelButtonIdx,
  detectLayoutFromPadId,
} from './controlMappings';

let cachedId = '';
let cachedLayout: ControllerLayout = 'xbox';

export function getActiveLayout(): ControllerLayout {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return cachedLayout;
  const pads = navigator.getGamepads();
  for (const pad of pads) {
    if (!pad) continue;
    if (pad.id !== cachedId) {
      cachedId = pad.id;
      cachedLayout = detectLayoutFromPadId(pad.id);
    }
    return cachedLayout;
  }
  // No pad connected — keep the last value.
  return cachedLayout;
}

export function getConfirmButton(): number { return confirmButtonIdx(getActiveLayout()); }
export function getCancelButton(): number  { return cancelButtonIdx(getActiveLayout()); }
export function getCachedPadId(): string   { return cachedId; }
