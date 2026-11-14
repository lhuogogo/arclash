import { MenuItem, Select } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { type LogLevel } from 'tauri-plugin-mihomo-api'

import { useClash } from '@/hooks/use-clash'
import { useClashLog } from '@/hooks/use-clash-log'

import { GuardState } from './mods/guard-state'
import { SettingItem } from './mods/setting-comp'

interface Props {
  onError: (err: Error) => void
}

/**
 * The log-level row, the only core behaviour left in 基础设置 after 统一延迟
 * moved under IPv6 in 系统 (user, 11-13).
 */
export const SettingClashLogLevelRow = ({ onError }: Props) => {
  const { t } = useTranslation()

  const { clash, mutateClash, patchClash } = useClash()
  const [, setClashLog] = useClashLog()

  const { 'log-level': logLevel } = clash ?? {}

  const onChangeData = (patch: Partial<IConfigData>) => {
    mutateClash((old) => ({ ...old!, ...patch }), false)
  }

  return (
      <SettingItem
        label={t('settings.sections.clash.form.fields.logLevel')}
        note={t('settings.sections.clash.form.tooltips.logLevel')}
      >
        {/* Same popup form as the language row (user, 11-14): five options
            read better as a dropdown than as a five-button strip. */}
        <GuardState
          value={logLevel === 'warn' ? 'warning' : (logLevel ?? 'info')}
          onCatch={onError}
          onFormat={(e: any) => e.target.value}
          onChange={(e) => onChangeData({ 'log-level': e })}
          onGuard={(e) => {
            setClashLog((pre) => ({
              ...pre!,
              logLevel: e.toUpperCase() as LogLevel,
            }))
            return patchClash({ 'log-level': e })
          }}
        >
          <Select
            size="small"
            sx={{ width: 110, '> div': { py: '7.5px' } }}
            MenuProps={{ anchorOrigin: { vertical: 'center', horizontal: 'center' }, transformOrigin: { vertical: 'center', horizontal: 'center' } }}
          >
            {(
              [
                'debug',
                'info',
                'warning',
                'error',
                'silent',
              ] as const
            ).map((level) => (
              <MenuItem key={level} value={level}>
                {t(`settings.sections.clash.form.options.logLevel.${level}`)}
              </MenuItem>
            ))}
          </Select>
        </GuardState>
      </SettingItem>
  )
}

export default SettingClashLogLevelRow
