import { ContentCopyRounded } from '@mui/icons-material'
import { Box, Menu, MenuItem, Typography } from '@mui/material'
import { useCallback, useRef, useState } from 'react'
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

const SettingVergeAdvanced = ({ onError: _ }: Props) => {
  const { t } = useTranslation()
  const { version: coreVersion } = useClash()

  // The three directory rows collapsed into one entry (user, 11-13): they were
  // three separate lines of the same rare navigation. The menu anchors to the
  // wrapper because SettingItem does not forward a ref.
  const dirRowRef = useRef<HTMLDivElement>(null)
  const [dirMenuOpen, setDirMenuOpen] = useState(false)

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

  const pickDir = (open: () => unknown) => {
    setDirMenuOpen(false)
    void open()
  }

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

      <Box ref={dirRowRef}>
        <SettingItem
          onClick={() => setDirMenuOpen(true)}
          label={t('settings.components.verge.advanced.fields.openDirMenu')}
          note={t('settings.components.verge.advanced.tooltips.openConfDir')}
        />
      </Box>

      <Menu
        anchorEl={dirRowRef.current}
        open={dirMenuOpen}
        onClose={() => setDirMenuOpen(false)}
      >
        <MenuItem onClick={() => pickDir(openAppDir)}>
          {t('settings.components.verge.advanced.fields.openConfDir')}
        </MenuItem>
        <MenuItem onClick={() => pickDir(openCoreDir)}>
          {t('settings.components.verge.advanced.fields.openCoreDir')}
        </MenuItem>
        <MenuItem onClick={() => pickDir(openLogsDir)}>
          {t('settings.components.verge.advanced.fields.openLogsDir')}
        </MenuItem>
      </Menu>

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
