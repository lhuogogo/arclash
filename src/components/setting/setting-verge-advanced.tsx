import { ContentCopyRounded } from '@mui/icons-material'
import { MenuItem, Select, Typography } from '@mui/material'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TooltipIcon } from '@/components/base'
import { useClash } from '@/hooks/use-clash'
import {
  exportDiagnosticInfo,
  openAppDir,
  openCoreDir,
  openDevTools,
  openLogsDir,
} from '@/services/cmds'
import { mutate } from '@/services/mutate'
import { showNotice } from '@/services/notice-service'
import { version } from '@root/package.json'

import { SettingItem, SettingList } from './mods/setting-comp'

interface Props {
  onError?: (err: Error) => void
}

const SettingVergeAdvanced = ({ onError: _onError }: Props) => {
  const { t } = useTranslation()
  const { version: coreVersion } = useClash()

  // The three directory rows collapsed into one entry (user, 11-13); the
  // dropdown keeps a value only so the popup form matches the language row.
  const [dirChoice, setDirChoice] = useState('conf')

  const onExportDiagnosticInfo = useCallback(async () => {
    await mutate(() => exportDiagnosticInfo(), {
      id: 'export-diagnostic-info',
      errorNotice: false,
    })
    showNotice.success('shared.feedback.notifications.common.copySuccess', 1000)
  }, [])

  const copyVersion = useCallback(() => {
    navigator.clipboard.writeText(`v${version}`).then(() => {
      showNotice.success(
        'settings.components.verge.advanced.notifications.versionCopied',
        1000,
      )
    })
  }, [])

  return (
    <SettingList title={t('settings.components.verge.advanced.title')}>
      <SettingItem
        label={t('settings.components.verge.advanced.fields.vergeVersion')}
        extra={
          <TooltipIcon
            icon={ContentCopyRounded}
            onClick={copyVersion}
            title={t('settings.components.verge.advanced.actions.copyVersion')}
          />
        }
      >
        <Typography sx={{ py: '7px', pr: 1 }}>v{version}</Typography>
      </SettingItem>

      <SettingItem label={t('settings.sections.clash.form.fields.clashCore')}>
        <Typography sx={{ py: '7px', pr: 1 }}>{coreVersion}</Typography>
      </SettingItem>

      {/* Same popup form as the language row (user, 11-14): the row shows the
          chosen folder name and opens the dropdown in place, replacing the
          floating Menu that anchored off the row. */}
      <SettingItem
        label={t('settings.components.verge.advanced.fields.openDirMenu')}
        note={t('settings.components.verge.advanced.tooltips.openConfDir')}
      >
      {/* No GuardState: this is a launcher, not a persisted setting — the
          dropdown keeps its label and fires the matching opener. */}
          <Select
            size="small"
            value={dirChoice}
            sx={{ width: 130, '> div': { py: '7.5px' } }}
            MenuProps={{ anchorOrigin: { vertical: 'center', horizontal: 'center' }, transformOrigin: { vertical: 'center', horizontal: 'center' } }}
            onChange={(e) => {
              const choice = e.target.value as string
              setDirChoice(choice)
              if (choice === 'conf') void openAppDir()
              if (choice === 'core') void openCoreDir()
              if (choice === 'logs') void openLogsDir()
            }}
          >
            <MenuItem value="conf">
              {t('settings.components.verge.advanced.fields.openConfDir')}
            </MenuItem>
            <MenuItem value="core">
              {t('settings.components.verge.advanced.fields.openCoreDir')}
            </MenuItem>
            <MenuItem value="logs">
              {t('settings.components.verge.advanced.fields.openLogsDir')}
            </MenuItem>
          </Select>
      </SettingItem>

      <SettingItem
        onClick={() => {
          void mutate(() => openDevTools(), {
            id: 'open-devtools',
            errorNotice: false,
          }).catch(() => {})
        }}
        label={t('settings.components.verge.advanced.fields.openDevTools')}
      />

      <SettingItem
        label={t('settings.components.verge.advanced.fields.exportDiagnostics')}
        extra={
          <TooltipIcon
            icon={ContentCopyRounded}
            onClick={onExportDiagnosticInfo}
          />
        }
      ></SettingItem>

    </SettingList>
  )
}

export default SettingVergeAdvanced
