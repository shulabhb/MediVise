
/**
 * Subtle background ripple effect for hero/home sections.
 * Pure CSS animation, no user interaction, low opacity, pointer-events: none.
 */
export default function Ripple() {
  return (
    <div className="ripple-bg" aria-hidden>
      {/* centered dark-ish grey-blue rings */}
      <span style={{ ['--rx' as any]: '50%', ['--ry' as any]: '50%', ['--rcolor' as any]: 'rgba(51, 65, 85, 0.9)' }} />
      <span style={{ ['--rx' as any]: '50%', ['--ry' as any]: '50%', ['--rcolor' as any]: 'rgba(71, 85, 105, 0.85)' }} />
      <span style={{ ['--rx' as any]: '50%', ['--ry' as any]: '50%', ['--rcolor' as any]: 'rgba(100, 116, 139, 0.8)' }} />
      <span style={{ ['--rx' as any]: '50%', ['--ry' as any]: '50%', ['--rcolor' as any]: 'rgba(148, 163, 184, 0.75)' }} />
      <span style={{ ['--rx' as any]: '50%', ['--ry' as any]: '50%', ['--rcolor' as any]: 'rgba(203, 213, 225, 0.7)' }} />
    </div>
  );
}


