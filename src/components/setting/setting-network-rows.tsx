import { Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseDialog, DialogRef } from '@/components/base'
import { useClash } from '@/hooks/use-clash'
import { useProfiles } from '@/hooks/use-profiles'
import { useVerge } from '@/hooks/use-verge'
import { setDnsOverride } from '@/services/cmds'
import { mutate } from '@/services/mutate'
import { showNotice } from '@/services/notice-service'

import { ArkSwitch } from './mods/ark-switch'
import { DnsViewer } from './mods/dns-viewer'
import { GuardState } from './mods/guard-state'
import { SettingItem } from './mods/setting-comp'

interface Props {
  onError: (err: Error) => void
}

/**
 * The network-integration rows of the former Clash section, rendered inside the
 * 系统 section (user, 11-13 regrouped the settings page). They stay in one
 * component because the DNS switch carries its own confirmation flow.
 */
export const SettingNetworkRows = ({ onError }: Props) => {
  const { t } = useTranslation()

  const { clash, mutateClash, patchClash } = useClash()
  const { verge, mutateVerge, patchVerge } = useVerge()
  const enableExternalController = verge?.enable_external_controller
  const { current: currentProfile } = useProfiles()

  const dnsEnabled = currentProfile
    ? (verge?.profile_dns_settings?.[currentProfile.uid!]?.enabled ??
      verge?.enable_dns_settings ??
      false)
    : false

  const {
    ipv6,
    'unified-delay': unifiedDelay,
    'allow-lan': allowLan,
  } = clash ?? {}

  const [dnsConfirmation, setDnsConfirmation] = useState<{
    profileUid: string
    source: string
  } | null>(null)
  const [dnsUpdating, setDnsUpdating] = useState(false)

  const dnsRef = useRef<DialogRef>(null)

  const onSwitchFormat = (_e: any, value: boolean) => value
  const onChangeData = (patch: Partial<IConfigData>) => {
    mutateClash((old) => ({ ...old!, ...patch }), false)
  }

  const handleDnsToggle = useLockFn(
    async (
      enable: boolean,
      confirmation?: string,
      profileUid = currentProfile?.uid,
    ) => {
      if (!profileUid) return
      setDnsUpdating(true)
      try {
        const result = await mutate(
          () => setDnsOverride(profileUid, enable, confirmation),
          {
            id: 'set-dns-override',
            errorNotice: false,
          },
        )
        if (!result.ok) return
        const outcome = result.value
        if (outcome.status === 'confirmation_required') {
          setDnsConfirmation({ profileUid, source: outcome.source })
        } else {
          setDnsConfirmation(null)
        }
        mutateVerge()
        mutateClash()
      } catch (err: any) {
        showNotice.error(err)
      } finally {
        setDnsUpdating(false)
      }
    },
  )

  const closeDnsConfirmation = () => {
    if (!dnsUpdating) setDnsConfirmation(null)
  }

  return (
    <>
      <DnsViewer ref={dnsRef} />
      <BaseDialog
        open={dnsConfirmation !== null}
        title={t('settings.modals.dns.protection.title')}
        okBtn={t('settings.modals.dns.protection.enableAnyway')}
        cancelBtn={t('settings.modals.dns.protection.keepDisabled')}
        contentSx={{ width: { xs: 320, sm: 420 } }}
        loading={dnsUpdating}
        disableCancel={dnsUpdating}
        onCancel={closeDnsConfirmation}
        onClose={closeDnsConfirmation}
        onOk={() => {
          if (dnsConfirmation)
            void handleDnsToggle(
              true,
              dnsConfirmation.source,
              dnsConfirmation.profileUid,
            )
        }}
      >
        <Typography variant="body2">
          {t('settings.modals.dns.protection.message')}
        </Typography>
      </BaseDialog>

      <SettingItem
        label={t('settings.sections.clash.form.fields.allowLan')}
        note={t('settings.sections.clash.form.tooltips.allowLan')}
      >
        <GuardState
          value={allowLan ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ 'allow-lan': e })}
          onGuard={(e) => patchClash({ 'allow-lan': e })}
        >
          <ArkSwitch />
        </GuardState>
      </SettingItem>

      {/* The DNS override dialog left the main view (user, 11-13); the switch
          itself stays because it is the feature, not its editor. */}
      <SettingItem
        label={t('settings.sections.clash.form.fields.dnsOverwrite')}
        note={t('settings.modals.dns.dialog.profileScope')}
      >
        <ArkSwitch
          checked={dnsEnabled}
          disabled={!currentProfile || dnsUpdating || dnsConfirmation !== null}
          onChange={(_, checked) => handleDnsToggle(checked)}
        />
      </SettingItem>

      <SettingItem label={t('settings.sections.clash.form.fields.ipv6')}>
        <GuardState
          value={ipv6 ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ ipv6: e })}
          onGuard={(e) => patchClash({ ipv6: e })}
        >
          <ArkSwitch />
        </GuardState>
      </SettingItem>

      <SettingItem
        label={t('settings.sections.clash.form.fields.unifiedDelay')}
        note={t('settings.sections.clash.form.tooltips.unifiedDelay')}
      >
        <GuardState
          value={unifiedDelay ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ 'unified-delay': e })}
          onGuard={(e) => patchClash({ 'unified-delay': e })}
        >
          <ArkSwitch />
        </GuardState>
      </SettingItem>

      {/* One switch instead of two dialogs (user, 11-13). The core pipes its
          config to the app over a sidecar socket, so turning the HTTP
          controller off does not cut the app off from the core. */}
      <SettingItem
        label={t('settings.sections.clash.form.fields.external')}
        note={t('settings.sections.clash.form.tooltips.externalController')}
      >
        <GuardState
          value={enableExternalController ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => {
            void patchVerge({ enable_external_controller: e })
          }}
        >
          <ArkSwitch />
        </GuardState>
      </SettingItem>
    </>
  )
}

export default SettingNetworkRows
