/**
 * Steampunk toggle for the RS-00 status block: starts/stops the core.
 *
 * Visuals are the user's skeuomorphic push button, ported verbatim into
 * ark-layout.scss (`.steampunk-btn` section). The lit state (`.is-on`)
 * persists the original `:active` pressed look; there is deliberately no
 * transition — the user asked for an instant on/off switch with zero visual
 * changes beyond that state.
 *
 * Interaction contract (user, 2026-11-12): core running = lit, stopped =
 * rest state; the click only flips the state and keeps the existing
 * stop/start-core behaviour (plan B) via `onToggle`.
 *
 * Every box-shadow in the SCSS section needs !important because the theme's
 * global `* { box-shadow: none !important }` would otherwise erase the whole
 * skeuomorphic layering (AGENTS.md, known constraint).
 */

interface SteampunkToggleProps {
  /** Core is running: render the lit state. */
  on: boolean
  onToggle: () => void
  /** Accessible name per state. */
  labelOn: string
  labelOff: string
  /** Hover tooltip per state. */
  titleOn: string
  titleOff: string
}

export const SteampunkToggle = ({
  on,
  onToggle,
  labelOn,
  labelOff,
  titleOn,
  titleOff,
}: SteampunkToggleProps) => (
  <button
    type="button"
    className={`steampunk-btn${on ? ' is-on' : ''}`}
    onClick={(event) => {
      // The wrapping block navigates on click; the switch must not.
      event.stopPropagation()
      onToggle()
    }}
    aria-pressed={on}
    aria-label={on ? labelOn : labelOff}
    title={on ? titleOn : titleOff}
  >
    <span className="btn-frame">
      <span className="btn-glass">
        <span className="glass-pattern" />
        <span className="amber-glow" />
        <span className="glass-reflection" />
        <span className="btn-text" aria-hidden="true">
          ✦
        </span>
      </span>
    </span>
  </button>
)

export default SteampunkToggle
