import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'

interface Props {
  checked?: boolean
  disabled?: boolean
  /** `raid` renders the on-state in the TUN assault red instead of accent. */
  tone?: 'accent' | 'raid'
  /** GuardState forwards the MUI-style signature; the event itself is unused. */
  onChange?: (event: unknown, checked: boolean) => void
}

/**
 * 方舟式矩形滑块开关（settings page only; the home cards keep the round
 * MUI switch). Texture + inset shading replicate the mechanical feel; every
 * shadow needs `!important` because the theme bans box-shadows globally.
 */
export const ArkSwitch = ({
  checked = false,
  disabled = false,
  tone = 'accent',
  onChange,
}: Props) => {
  const { t } = useTranslation()

  const on = checked
  const label = on
    ? t('settings.components.arkSwitch.on')
    : t('settings.components.arkSwitch.off')

  const backgroundColor = on ? (tone === 'raid' ? 'var(--ark-raid)' : 'var(--ark-accent)') : 'var(--ark-seg)'
  const labelColor = on && tone === 'raid' ? '#262727' : on ? '#fff' : 'var(--ark-text-2)'

  return (
    <Box
      role="switch"
      aria-checked={on}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onChange?.(undefined, !on)
      }}
      sx={{
        width: 112,
        height: 36,
        display: 'flex',
        alignItems: 'stretch',
        border: '1px solid var(--ark-border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
        opacity: disabled ? 0.45 : 1,
        backgroundColor,
      }}
    >
      {/* fine cross-hatched texture */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,.06) 0 2px, transparent 2px 6px)',
        }}
      />
      {/* inset shading: lit top, dark bottom — needs !important vs the global ban */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow:
            'inset 0 2px 3px rgba(255,255,255,.22), inset 0 -3px 5px rgba(0,0,0,.3), inset 0 0 0 1px rgba(0,0,0,.15) !important',
        }}
      />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: on ? 'flex-start' : 'flex-end',
          padding: '0 10px',
          letterSpacing: 2,
          fontSize: 13,
          fontWeight: 600,
          color: labelColor,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {label}
      </Box>
      <Box
        sx={{
          width: 38,
          margin: '3px',
          flex: 'none',
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#e9e9e9',
          boxShadow:
            'inset 0 1px 2px rgba(255,255,255,.9), inset 0 -2px 3px rgba(0,0,0,.25), 1px 1px 2px rgba(0,0,0,.4) !important',
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
