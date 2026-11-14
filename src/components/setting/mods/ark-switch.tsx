import Box from '@mui/material/Box'

interface Props {
  checked?: boolean
  disabled?: boolean
  /** `raid` tints the groove's on-state with the TUN assault red. */
  tone?: 'accent' | 'raid'
  /** GuardState forwards the MUI-style signature; the event itself is unused. */
  onChange?: (event: unknown, checked: boolean) => void
}

/**
 * 方舟凹槽滑块（settings page only; the home cards keep the round MUI
 * switch). A recessed rectangular groove with a solid knob that slides
 * right for on and left for off (user, 11-14) — no label text. Every shadow
 * needs `!important` because the theme bans box-shadows globally; transform
 * is unaffected, so the knob's slide transition works as-is.
 */
export const ArkSwitch = ({
  checked = false,
  disabled = false,
  tone = 'accent',
  onChange,
}: Props) => {
  const on = checked

  // Groove: on = accent (raid tint for TUN), off = dark well.
  const grooveColor = on
    ? tone === 'raid'
      ? 'var(--ark-raid)'
      : 'var(--ark-accent)'
    : 'var(--ark-seg, #3a3b3b)'

  return (
    <Box
      role="switch"
      aria-checked={on}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onChange?.(undefined, !on)
      }}
      sx={{
        width: 84,
        height: 28,
        flexShrink: 0,
        border: '1px solid var(--ark-border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        position: 'relative',
        opacity: disabled ? 0.45 : 1,
        backgroundColor: grooveColor,
        transition: 'background 0.15s ease-out, transform 0.08s ease-out',
        // 凹槽：上暗下亮的内阴影（inset，上压光下漏光）
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow:
            'inset 0 2px 3px rgba(0,0,0,.45), inset 0 -1px 2px rgba(255,255,255,.18) !important',
        },
        '&:active': { transform: 'scale(0.96)' },
      }}
    >
      {/* 立体白块：受光顶面 + 投影，随状态左右滑动 */}
      <Box
        sx={{
          position: 'absolute',
          top: 2,
          left: on ? 'calc(100% - 41px)' : 3,
          width: 38,
          height: 24,
          backgroundColor: 'var(--ark-knob)',
          // 1px 分界线：浅色下纯白块贴浅槽需要描边才看得见轮廓。
          boxShadow:
            'inset 0 0 0 1px rgba(0,0,0,.2), inset 0 1px 1px rgba(255,255,255,.9), inset 0 -1px 2px rgba(0,0,0,.3), 1px 1px 2px rgba(0,0,0,.45) !important',
          transition: 'left 0.15s ease-out',
          // 淡斜纹（用户 11-14：别太明显）
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(45deg, rgba(0,0,0,.05) 0 2px, transparent 2px 6px)',
          },
        }}
      />
    </Box>
  )
}

export default ArkSwitch
