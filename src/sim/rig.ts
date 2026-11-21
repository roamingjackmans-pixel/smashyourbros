// Forward kinematics: a RigDef + a Pose -> world-space bone points. Used by the simulation (hit/hurtboxes) and the
// renderer (drawing). Angle conventions in docs/DESIGN.md. Local frame: x forward, y up; world: y down.
import { dcos, dsin } from './math';
import type { Bone, Pose, RigDef, Skel } from './types';

type P2 = [number, number];

/** direction for a local angle phi (0 = up, 90 = forward, 180 = down, 270 = back), local y-up */
function dir(phi: number): P2 {
  return [dsin(phi), dcos(phi)];
}
function add(a: P2, phi: number, len: number): P2 {
  const d = dir(phi);
  return [a[0] + d[0] * len, a[1] + d[1] * len];
}

export interface LocalSkel {
  pts: Record<Exclude<Bone, 'torso'>, P2>;
  phi: Record<string, number>;
}

/**
 * Local-space skeleton, feet origin at (0,0), y up. With autoGround the lowest foot is planted at y = pose.y
 * (so bent knees lower the hip instead of lifting the feet off the floor).
 */
export function localSkel(rig: RigDef, p: Pose, autoGround: boolean): LocalSkel {
  const phiT = p.rot + p.lean;
  const phi = {
    torso: phiT,
    armF: phiT + 180 - p.armF,
    armB: phiT + 180 - p.armB,
    foreF: 0,
    foreB: 0,
    thF: p.rot + 180 - p.legF,
    thB: p.rot + 180 - p.legB,
    shF: 0,
    shB: 0,
    head: phiT + p.head,
    wep: 0,
    tail: p.rot + 180 + p.tail,
  };
  phi.foreF = phi.armF - p.foreF;
  phi.foreB = phi.armB - p.foreB;
  phi.shF = phi.thF + p.shinF;
  phi.shB = phi.thB + p.shinB;
  phi.wep = phi.foreF - p.wep;

  const hip: P2 = [p.x, rig.thigh + rig.shin + p.y];
  const kneeF = add(hip, phi.thF, rig.thigh);
  const kneeB = add(hip, phi.thB, rig.thigh);
  const footF = add(kneeF, phi.shF, rig.shin);
  const footB = add(kneeB, phi.shB, rig.shin);
  const neck = add(hip, phiT, rig.torso);
  const shoulder = add(hip, phiT, rig.torso * (rig.shoulder ?? 0.9));
  const head = add(neck, phi.head, rig.head * 0.85);
  const elbowF = add(shoulder, phi.armF, rig.upper);
  const elbowB = add(shoulder, phi.armB, rig.upper);
  const handF = add(elbowF, phi.foreF, rig.fore);
  const handB = add(elbowB, phi.foreB, rig.fore);
  const wl = rig.wep ?? 0;
  const wep = add(handF, phi.wep, wl);
  const wepMid = add(handF, phi.wep, wl * 0.55);
  const tail = add(hip, phi.tail, rig.tail ?? 0);
  const pts = { hip, neck, head, shoulder, elbowF, handF, elbowB, handB, kneeF, footF, kneeB, footB, wep, wepMid, tail };
  if (autoGround) {
    // plant the lowest body point (feet, knees, hip, head) on the floor; hands and weapons may dip below
    const low = Math.min(footF[1], footB[1], kneeF[1], kneeB[1], hip[1] - rig.girth * 0.6, neck[1] - rig.girth * 0.6, head[1] - rig.head);
    const shift = p.y - low;
    for (const k in pts) pts[k as keyof typeof pts][1] += shift;
  }
  return { pts, phi };
}

/** world skeleton. scale multiplies the rig; facing mirrors x; grav -1 hangs the fighter upside down. */
export function worldSkel(rig: RigDef, p: Pose, x: number, y: number, facing: number, grav: number, scale: number, autoGround: boolean): Skel {
  const L = localSkel(rig, p, autoGround);
  const tr = (v: P2): P2 => [x + v[0] * facing * scale, y - v[1] * grav * scale];
  const t = L.pts;
  return {
    hip: tr(t.hip),
    neck: tr(t.neck),
    head: tr(t.head),
    shoulder: tr(t.shoulder),
    elbowF: tr(t.elbowF),
    handF: tr(t.handF),
    elbowB: tr(t.elbowB),
    handB: tr(t.handB),
    kneeF: tr(t.kneeF),
    footF: tr(t.footF),
    kneeB: tr(t.kneeB),
    footB: tr(t.footB),
    wep: tr(t.wep),
    wepMid: tr(t.wepMid),
    tail: tr(t.tail),
    ang: L.phi,
    scale,
    facing,
    grav,
  };
}

/** world point for a bone + local offset (x forward, y up), using the skeleton's facing/grav/scale */
export function bonePoint(s: Skel, bone: Bone | undefined, ox: number, oy: number): P2 {
  const b = bone === undefined || bone === 'torso' ? s.hip : s[bone];
  return [b[0] + ox * s.facing * s.scale, b[1] - oy * s.grav * s.scale];
}

/** standing height of a rig (feet to top of head), unscaled */
export function rigHeight(rig: RigDef): number {
  return rig.thigh + rig.shin + rig.torso + rig.head * 1.85;
}
