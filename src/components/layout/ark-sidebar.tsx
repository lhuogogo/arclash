import type { ReactNode } from 'react'

/**
 * Right-hand button matrix for the ArClash layout.
 *
 * Replaces the original left navigation sidebar. Six blocks stacked in a
 * single column; clicking a block swaps the main view in place instead of
 * routing to another page.
 *
 * Sizing follows the v6 prototype: the column is a flex stack and each block
 * takes a proportional share of the remaining height, so the column always
 * fills the window without the empty gap the original sidebar left behind.
 *
 * Each block is a wrapper that paints the 1px stroke plus an inner surface.
 * The wrapper/inner split exists because a clip-path cut corner cannot keep
 * an inset box-shadow along the diagonal; see ark-layout.scss for the
 * measurement.
 *
 * Callback contract: `onNavigate(key)` receives exactly one page key. The
 * owner of this component decides what each key renders; this component never
 * calls an API and never renders page content. Keys are, in display order:
 *
 *   status       default landing page, home/status summary
 *   proxies      proxy group list
 *   profiles     subscription profiles, including the right-click menu
 *   connections  live connection list
 *   download     traffic history
 *   settings     advanced settings
 *
 * Flex weights come from the v1 block heights (131:77:64:85 normalised) so
 * the column matches the original proportions rather than splitting evenly.
 */

export type ArkPageKey =
  | 'status'
  | 'proxies'
  | 'profiles'
  | 'connections'
  | 'download'
  | 'settings'

export interface ArkNavItem {
  key: ArkPageKey
  /** Rendered in the block header. */
  label: string
  /**
   * Registry-style code shown top-right of the block, e.g. `RS-01`.
   * v6 numbers the six blocks RS-00..RS-05 in display order; it is decoration,
   * not an identifier, so it is a plain string rather than derived from key.
   */
  code?: string
  /** Line-art glyph, 16x16, inherits currentColor. */
  icon?: ReactNode
  /** Latin name under the icon, rendered in the muted letter-spaced style. */
  latin?: string
  /** Optional muted line under the label. */
  sublabel?: ReactNode
  /**
   * Render `sublabel` in full-strength text instead of the muted colour.
   * Used by the subscription block, where the name is the block's subject
   * rather than a secondary fact like the settings block's mode name.
   */
  sublabelBright?: boolean
  /** Optional trailing content, e.g. a live counter. */
  trailing?: ReactNode
  /** Optional body rendered between header and footer. */
  body?: ReactNode
}

/**
 * One visual row of the matrix. v9 stacks four rows: status, the
 * proxies/profiles pair, connections, and the download/settings pair. A row
 * with two items splits its width evenly between them.
 *
 * Row height is not carried here: it lives in ark-layout.scss keyed by the
 * first item's key (`ark-row--status`, `--proxies`, `--connections`,
 * `--download`), because those heights were measured against the real window
 * and inline flex values would override them.
 */
export interface ArkNavRow {
  items: ArkNavItem[]
}

interface ArkSidebarProps {
  rows: ArkNavRow[]
  active: ArkPageKey
  onNavigate: (key: ArkPageKey) => void
}

export const ArkSidebar = ({ rows, active, onNavigate }: ArkSidebarProps) => (
  <nav className="ark-rightcol" aria-label="主导航">
    {rows.map((row) => (
      <div
        key={row.items.map((item) => item.key).join('+')}
        // Row height comes from the first item's key via a modifier class, not
        // from an inline flex value: inline styles would win over the row
        // rules in ark-layout.scss, and those rules are what encode the
        // measured heights (status auto, pairs 96/92, connections fills).
        className={`ark-row ark-row--${row.items[0]?.key ?? 'status'}${
          row.items.length > 1 ? ' ark-row--pair' : ''
        }`}
      >
        {row.items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`ark-btn${active === item.key ? ' is-active' : ''}`}
            onClick={() => onNavigate(item.key)}
            aria-current={active === item.key ? 'page' : undefined}
          >
            <span className="ark-btn__surface">
              <span className="ark-btn__head">
                <span className="ark-btn__label">{item.label}</span>
                {item.code ? (
                  <span className="ark-btn__code">{item.code}</span>
                ) : null}
                {item.trailing ? (
                  <span className="ark-btn__trailing">{item.trailing}</span>
                ) : null}
              </span>
              {item.icon ? (
                <span className="ark-btn__icon" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              {item.sublabel ? (
                <span
                  className={`ark-btn__sub${item.sublabelBright ? ' is-bright' : ''}`}
                >
                  {item.sublabel}
                </span>
              ) : null}
              {item.body ? (
                <span className="ark-btn__body">{item.body}</span>
              ) : null}
              {item.latin ? (
                <span className="ark-btn__latin">{item.latin}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    ))}
  </nav>
)
