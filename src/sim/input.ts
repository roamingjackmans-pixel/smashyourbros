// One frame of one player's controls, packed into a single int for the network:
//   bits 0-7   stick x + 128   (x in -100..100, + = right in world space)
//   bits 8-15  stick y + 128   (y in -100..100, + = UP, stick convention)
//   bits 16-23 buttons
//   bits 24-26 smash stick: 0 none, 1 up, 2 right, 3 down, 4 left (world directions)

export const B_ATTACK = 1;
export const B_SPECIAL = 2;
export const B_JUMP = 4;
export const B_SHIELD = 8;
export const B_GRAB = 16;
export const B_TAUNT = 32;
export const B_ULT = 64; // dedicated ultimate key (Attack+Special together also works)

export const C_NONE = 0;
export const C_UP = 1;
export const C_RIGHT = 2;
export const C_DOWN = 3;
export const C_LEFT = 4;

export function pack(x: number, y: number, b: number, c = 0): number {
  const xi = Math.max(-100, Math.min(100, Math.round(x))) + 128;
  const yi = Math.max(-100, Math.min(100, Math.round(y))) + 128;
  return (xi & 255) | ((yi & 255) << 8) | ((b & 255) << 16) | ((c & 7) << 24);
}

export const NEUTRAL = pack(0, 0, 0, 0);

export function ix(p: number): number {
  return (p & 255) - 128;
}
export function iy(p: number): number {
  return ((p >>> 8) & 255) - 128;
}
export function ib(p: number): number {
  return (p >>> 16) & 255;
}
export function ic(p: number): number {
  return (p >>> 24) & 7;
}
