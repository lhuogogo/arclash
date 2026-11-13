import React from 'react'
import { useTranslation } from 'react-i18next'

import ProxyControlSwitches from '@/components/shared/proxy-control-switches'
import { useVerge } from '@/hooks/use-verge'

import { ArkSwitch } from './mods/ark-switch'
import { GuardState } from './mods/guard-state'
import { SettingList, SettingItem } from './mods/setting-comp'
import { SettingNetworkRows } from './setting-network-rows'

interface Props {
  onError?: (err: Error) => void
}

/**
 * 系统: everything that changes how the app integrates with the machine —
 * proxies, TUN, LAN exposure, DNS, autostart. The former Clash section's
 * network rows moved here when the page regrouped (user, 11-13).
 */
const SettingSystem = ({ onError }: Props) => {
  const { t } = useTranslation()

  const { verge, mutateVerge, patchVerge } = useVerge()

  const { enable_auto_launch, enable_silent_start } = verge ?? {}

  const onSwitchFormat = (
    _e: React.ChangeEvent<HTMLInputElement>,
    value: boolean,
  ) => value
  const onChangeData = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false)
  }

  return (
    <SettingList title={t('settings.sections.system.title')}>
      {/* The detail gears open the system-proxy and TUN dialogs, which left
          this page's main view (user, 11-13). The ark switch + note come from
          the settings-page restyle; the home card keeps the round switch. */}
      <ProxyControlSwitches
        label={t('settings.sections.system.toggles.systemProxy')}
        onError={onError}
        showDetail={false}
        note={t('settings.sections.proxyControl.tooltips.systemProxy')}
        arkSwitch
      />

      <ProxyControlSwitches
        label={t('settings.sections.system.toggles.tunMode')}
        onError={onError}
        showDetail={false}
        note={t('settings.sections.proxyControl.tooltips.tunMode')}
        arkSwitch
      />

      <SettingNetworkRows onError={onError!} />

      <SettingItem
        label={t('settings.sections.system.fields.autoLaunch')}
        note={t('settings.sections.system.tooltips.autoLaunch')}
      >
        <GuardState
          value={enable_auto_launch ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => {
            onChangeData({ enable_auto_launch: e })
          }}
          onGuard={async (e) => {
            try {
              // 先触发UI更新立即看到反馈
              onChangeData({ enable_auto_launch: e })
              await patchVerge({ enable_auto_launch: e })
              return Promise.resolve()
            } catch (error) {
              // 如果出错，恢复原始状态
              onChangeData({ enable_auto_launch: !e })
              return Promise.reject(error)
            }
          }}
        >
          <ArkSwitch />
        </GuardState>
      </SettingItem>

      <SettingItem
        label={t('settings.sections.system.fields.silentStart')}
        note={t('settings.sections.system.tooltips.silentStart')}
      >
        <GuardState
          value={enable_silent_start ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ enable_silent_start: e })}
          onGuard={(e) => patchVerge({ enable_silent_start: e })}
        >
          <ArkSwitch />
        </GuardState>
      </SettingItem>
    </SettingList>
  )
}

export default SettingSystem
