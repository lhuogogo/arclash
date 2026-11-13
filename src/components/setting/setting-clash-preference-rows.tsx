import { useTranslation } from 'react-i18next'
import { type LogLevel } from 'tauri-plugin-mihomo-api'

import { useClash } from '@/hooks/use-clash'
import { useClashLog } from '@/hooks/use-clash-log'

import { ArkSegmented } from './mods/ark-segmented'
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
        <GuardState
          value={logLevel === 'warn' ? 'warning' : (logLevel ?? 'info')}
          onCatch={onError}
          onChange={(e) => onChangeData({ 'log-level': e })}
          onGuard={(e) => {
            setClashLog((pre) => ({
              ...pre!,
              logLevel: e.toUpperCase() as LogLevel,
            }))
            return patchClash({ 'log-level': e })
          }}
        >
          <ArkSegmented
            options={[
              { value: 'debug', label: t('settings.sections.clash.form.options.logLevel.debug') },
              { value: 'info', label: t('settings.sections.clash.form.options.logLevel.info') },
              { value: 'warning', label: t('settings.sections.clash.form.options.logLevel.warning') },
              { value: 'error', label: t('settings.sections.clash.form.options.logLevel.error') },
              { value: 'silent', label: t('settings.sections.clash.form.options.logLevel.silent') },
            ]}
          />
        </GuardState>
      </SettingItem>
  )
}

export default SettingClashLogLevelRow
