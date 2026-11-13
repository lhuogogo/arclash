import Box from '@mui/material/Box'

export interface ArkSegmentedOption {
  value: string
  label: string
}

interface Props {
  options: ArkSegmentedOption[]
  value?: string
  disabled?: boolean
  /** GuardState forwards the value directly; no event object involved. */
  onChange?: (value: string) => void
}

/**
 * 方舟式横排分段按钮（settings page only). Adjacent options are joined by a
 * 1px tick line, selected option fills accent.
 */
export const ArkSegmented = ({
  options,
  value,
  disabled = false,
  onChange,
}: Props) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {options.map((opt, i) => {
        const selected = opt.value === value
        return (
          <Box key={opt.value} sx={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <Box
                sx={{
                  width: 14,
                  height: 1,
                  backgroundColor: 'var(--ark-border)',
                  flex: 'none',
                }}
              />
            )}
            <Box
              component="button"
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled && !selected) onChange?.(opt.value)
              }}
              sx={{
                appearance: 'none',
                border: '1px solid',
                borderColor: selected ? 'var(--ark-accent)' : 'var(--ark-border)',
                backgroundColor: selected ? 'var(--ark-accent)' : 'var(--ark-seg)',
                color: selected ? '#fff' : 'var(--ark-text-2)',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1,
                whiteSpace: 'nowrap',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                '&:hover': {
                  color: selected ? '#fff' : 'var(--ark-text)',
                },
              }}
            >
              {opt.label}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export default ArkSegmented
