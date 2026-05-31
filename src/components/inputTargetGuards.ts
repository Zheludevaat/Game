export function isNativeUiTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(
    'button, input, textarea, select, a[href], [contenteditable="true"], [role="button"], [role="slider"], [role="switch"], [role="menuitem"]',
  ));
}
