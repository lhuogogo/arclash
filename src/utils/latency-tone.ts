/**
 * One latency colour scale for the whole app.
 *
 * The value scale is the four tiers the prototype uses (gold → violet → blue →
 * green, `prototype/v9.html:331-335`). Two states are *not* values and must not
 * borrow a tier colour: a probe that timed out or returned an implausible value
 * is `.lat-bad`, the raid red — the same class the prototype uses for a failed
 * probe (`v9.html:936`, `:1378`). White is never a latency colour.
 *
 * Unknown (never probed, or a probe in flight) gets no colour at all — unknown
 * is not the same as slow.
 *
 * Colours resolve through the CSS custom properties declared in
 * `arclash-theme.scss`, so JS and SCSS never hold two copies of one hex.
 */
import { classifyDelay, DEFAULT_DELAY_TIMEOUT } from '@/utils/delay'

export type LatencyTone = 'gold' | 'purple' | 'blue' | 'green' | 'raid'

/**
 * Renders a latency for display, or undefined when there is nothing honest to
 * show.
 *
 * `getDelayFix` returns 1e6 for "probed and failed" and -1 for "never probed".
 * Printing either as a number produced "1000000 ms" on screen. A failed probe
 * shows as a bare dash in the raid colour; an unprobed node shows nothing at
 * all, because unknown is not the same as slow.
 *
 * Lives here beside the tone scale because both read the same sentinels: a
 * caller that shows a value but colours it elsewhere is how the two drifted
 * apart before.
 */
export const formatDelay = (ms: number | undefined): string | undefined => {
  if (ms == null || ms < 0) return undefined
  if (ms >= 10000) return '—'
  return `${ms} ms`
}

/**
 * Tier boundaries in milliseconds, upper bound inclusive. Mirrored by the
 * `.ark-lat--*` classes so a value and its colour can never disagree.
 */
export const latencyToneOf = (
  delay: number,
  timeout: number = DEFAULT_DELAY_TIMEOUT,
): LatencyTone | undefined => {
  switch (classifyDelay(delay, timeout)) {
    case 'untested':
    case 'testing':
      return undefined
    case 'timeout':
    case 'error':
      return 'raid'
    case 'measured':
      if (delay < 200) return 'gold'
      if (delay <= 500) return 'purple'
      if (delay <= 1000) return 'blue'
      return 'green'
  }
}

/**
 * The class the right-hand column already uses. Sharing it keeps the proxies
 * block and the node lists on one scale instead of two.
 */
export const latencyClassOf = (
  delay: number,
  timeout: number = DEFAULT_DELAY_TIMEOUT,
): string | undefined => {
  const tone = latencyToneOf(delay, timeout)
  return tone ? `ark-lat--${tone}` : undefined
}

const TONE_COLOR: Record<LatencyTone, string> = {
  gold: 'var(--ark-gold, #e8b84b)',
  purple: 'var(--ark-purple, #ce9cff)',
  blue: 'var(--ark-blue, #62b4f0)',
  green: 'var(--ark-green, #5cb85c)',
  raid: 'var(--ark-raid, #ff8a7a)',
}

/**
 * For MUI surfaces that paint their own colour and so cannot just inherit a
 * class. Same source of truth as `latencyClassOf`.
 */
export const latencyColorOf = (
  delay: number,
  timeout: number = DEFAULT_DELAY_TIMEOUT,
): string | undefined => {
  const tone = latencyToneOf(delay, timeout)
  return tone ? TONE_COLOR[tone] : undefined
}
