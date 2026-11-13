
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { DialogRef } from '@/components/base'
import { useVerge } from '@/hooks/use-verge'
import { navigationItems } from '@/pages/_navigation-meta'
import getSystem from '@/utils/get-system'

import { ArkSegmented } from './mods/ark-segmented'
import { BackupViewer } from './mods/backup-viewer'
import { ConfigViewer } from './mods/config-viewer'
import { GuardState } from './mods/guard-state'
import { HotkeyViewer } from './mods/hotkey-viewer'
import { MiscViewer } from './mods/misc-viewer'
import { SettingItem, SettingList } from './mods/setting-comp'
import { SettingClashLogLevelRow } from './setting-clash-preference-rows'

const OS = getSystem()

interface Props {
  onError?: (err: Error) => void
}

/**
 * 基础设置: the everyday preferences toolbar. Appearance moved to 主题 and the
 * core-behaviour rows arrived from the retired Clash section (user, 11-13).
 */
const SettingVergeBasic = ({ onError }: Props) => {
  const { t } = useTranslation()
  const { verge, mutateVerge, patchVerge } = useVerge()

  const { tray_event, start_page } = verge ?? {}

  const configRef = useRef<DialogRef>(null)
  const hotkeyRef = useRef<DialogRef>(null)
  const miscRef = useRef<DialogRef>(null)
  const backupRef = useRef<DialogRef>(null)

  const onChangeData = (patch: any) => {
    mutateVerge({ ...verge, ...patch }, false)
  }

  return (
    <SettingList title={t('settings.components.verge.basic.title')}>
      <ConfigViewer ref={configRef} />
      <HotkeyViewer ref={hotkeyRef} />
      <MiscViewer ref={miscRef} />
      <BackupViewer ref={backupRef} />

      <SettingItem
        label={t('settings.components.verge.basic.fields.startPage')}
      >
        <GuardState
          value={start_page ?? '/'}
          onCatch={onError}
          onChange={(e) => onChangeData({ start_page: e })}
          onGuard={(e) => patchVerge({ start_page: e })}
        >
          {/* Only the three everyday destinations stay (user, 11-14); the
              config value still accepts any page the backend persists. */}
          <ArkSegmented
            options={Object.values(navigationItems)
              .filter((page) => ['/', '/proxies', '/profile'].includes(page.path))
              .map((page) => ({
                value: page.path,
                label: t(page.label),
              }))}
          />
        </GuardState>
      </SettingItem>

      {OS !== 'linux' && (
        <SettingItem
          label={t('settings.components.verge.basic.fields.trayClickEvent')}
        >
          <GuardState
            value={tray_event ?? 'main_window'}
            onCatch={onError}
            onChange={(e) => onChangeData({ tray_event: e })}
            onGuard={(e) => patchVerge({ tray_event: e })}
          >
            {/* Two options only (user, 11-14); the backend still accepts the
                other tray actions for configs persisted before this cut. */}
            <ArkSegmented
              options={[
                { value: 'main_window', label: t('settings.components.verge.basic.trayOptions.showMainWindow') },
                { value: 'tray_menu', label: t('settings.components.verge.basic.trayOptions.showTrayMenu') },
              ]}
            />
          </GuardState>
        </SettingItem>
      )}

      <SettingClashLogLevelRow onError={onError!} />

      <SettingItem
        onClick={() => hotkeyRef.current?.open()}
        label={t('settings.components.verge.basic.fields.hotkeySetting')}
      />

      <SettingItem
        onClick={() => miscRef.current?.open()}
        label={t('settings.components.verge.basic.fields.misc')}
      />

      <SettingItem
        onClick={() => backupRef.current?.open()}
        label={t('settings.components.verge.basic.fields.backupSetting')}
      />

      <SettingItem
        onClick={() => configRef.current?.open()}
        label={t('settings.components.verge.basic.fields.runtimeConfig')}
      />
    </SettingList>
  )
}

export default SettingVergeBasic
