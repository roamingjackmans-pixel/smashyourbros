// CPU strength by level (D26), applied to damage dealt and knockback taken. No imports: combat and projectiles use it.
// The CPU's tactics only go so far, so low levels also hit softer and fly further, and levels 7-9 hit harder and fly
// less far. Bosses and stagehand fodder keep their own tuning.
//                lvl: -  1    2     3     4  5  6  7     8     9
const CPU_DMG = [1, 0.8, 0.88, 0.94, 1, 1, 1, 1.05, 1.12, 1.22];
const CPU_KB_TAKEN = [1, 1.1, 1.05, 1, 1, 1, 1, 0.97, 0.93, 0.88];
type CpuCfg = { cpu: number; boss?: string; grunt?: boolean } | undefined;
const cpuLevel = (pc: CpuCfg): number => (pc && pc.cpu > 0 && !pc.boss && !pc.grunt ? Math.min(9, pc.cpu) : 0);
/** damage multiplier for a fighter's attacks */
export function cpuDamage(pc: CpuCfg): number {
  return CPU_DMG[cpuLevel(pc)];
}
/** knockback multiplier for hits a fighter takes */
export function cpuKnockbackTaken(pc: CpuCfg): number {
  return CPU_KB_TAKEN[cpuLevel(pc)];
}
