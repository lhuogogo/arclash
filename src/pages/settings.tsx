import {
  BuildRounded,
  GitHub,
  HelpOutlineRounded,
  PaletteRounded,
  PowerSettingsNewRounded,
  SettingsRounded,
  Telegram,
  TuneRounded,
} from '@mui/icons-material'
import { Box, ButtonGroup, IconButton, Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useEffect, useRef, useState, startTransition } from 'react'
import { ViewTransition } from 'react'
import { useTranslation } from 'react-i18next'

import { BasePage } from '@/components/base'
import SettingSystem from '@/components/setting/setting-system'
import SettingTheme from '@/components/setting/setting-theme'
import SettingVergeAdvanced from '@/components/setting/setting-verge-advanced'
import SettingVergeBasic from '@/components/setting/setting-verge-basic'
import { exitApp } from '@/services/cmds'
import { mutate } from '@/services/mutate'
import { showNotice } from '@/services/notice-service'
import { openExternalUrl } from '@/utils/open-external-url'
import { version } from '@root/package.json'

const SettingPage = () => {
  const { t } = useTranslation()

  const onError = (err: any) => {
    showNotice.error(err)
  }

  const [section, setSection] = useState<
    'system' | 'basic' | 'theme' | 'advanced'
  >('system')
  const panelRef = useRef<HTMLDivElement>(null)

  // A section switch restarts reading from the top; without this the new
  // content inherits the previous section's scroll offset (user, 11-14).
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0
  }, [section])

  const toGithubRepo = useLockFn(() =>
    openExternalUrl('https://github.com/lhuogogo/arclash').catch(onError),
  )

  const toGithubDoc = useLockFn(() =>
    openExternalUrl('https://clash-verge-rev.github.io/index.html').catch(
      onError,
    ),
  )

  // The upstream Telegram channel is that project's announcement feed, so the
  // button stays for layout but no longer navigates anywhere (user, 11-13).
  const toTelegramChannel = useLockFn(async () => undefined)

  const onReset = useLockFn(async () => {
    // 行为占位：真实恢复默认逻辑待拍板
    showNotice.info('settings.page.notifications.resetPlaceholder')
  })

  const onExitApp = useLockFn(async () => {
    await mutate(() => exitApp(), {
      id: 'exit-app',
      errorNotice: false,
    }).catch(() => {})
  })

  // Nav labels are two characters (user, 11-14); the section banners keep the
  // full names, so the buttons use dedicated short keys.
  const navItems = [
    { key: 'system', label: t('settings.page.nav.system'), icon: <SettingsRounded /> },
    { key: 'basic', label: t('settings.page.nav.basic'), icon: <TuneRounded /> },
    { key: 'theme', label: t('settings.page.nav.theme'), icon: <PaletteRounded /> },
    { key: 'advanced', label: t('settings.page.nav.advanced'), icon: <BuildRounded /> },
  ] as const

  return (
    <BasePage
      title={t('settings.page.title')}
      header={
        <ButtonGroup
          variant="contained"
          aria-label={t('settings.page.actionsGroupLabel')}
        >
          <Box
            component="button"
            onClick={onReset}
            sx={{
              appearance: 'none',
              border: '1px solid var(--ark-border)',
              backgroundColor: 'var(--ark-seg)',
              color: 'var(--ark-text, #fff)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 2,
              padding: '7px 22px',
              mr: 1.5,
              cursor: 'pointer',
              transition: 'transform 0.08s ease-out',
              '&:hover': { borderColor: 'var(--ark-accent)' },
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            {t('settings.page.actions.resetSettings')}
          </Box>
          <IconButton
            size="medium"
            color="inherit"
            title={t('settings.page.actions.manual')}
            onClick={toGithubDoc}
          >
            <HelpOutlineRounded fontSize="inherit" />
          </IconButton>
          <IconButton
            size="medium"
            color="inherit"
            title={t('settings.page.actions.telegram')}
            onClick={toTelegramChannel}
          >
            <Telegram fontSize="inherit" />
          </IconButton>

          <IconButton
            size="medium"
            color="inherit"
            title={t('settings.page.actions.github')}
            onClick={toGithubRepo}
          >
            <GitHub fontSize="inherit" />
          </IconButton>
        </ButtonGroup>
      }
    >
      {/* 方舟化两栏骨架（用户拍板落地，11-13）：左分类导航 + 右滚动面板；
          一次只渲染当前分区，条目组件与功能逻辑原样复用。 */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        {/* Sticky: the nav column keeps its place while the tall section panel
            scrolls the page; without it the exit button rode the stretched
            column out of the window (user report, 11-14). */}
        <Box
          sx={{
            width: 142,
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '14px 0',
            position: 'sticky',
            top: 16,
            // Tall enough for the flex spacer below to stretch: the exit button
            // stays pinned to the column's bottom as the window grows
            // (user, 11-14); the cap keeps it fully visible at minimum size.
            height: 'calc(100vh - 140px)',
            minHeight: 380,
            overflow: 'auto',
          }}
        >
          {navItems.map((item) => {
            const active = section === item.key
            return (
              <Box
                key={item.key}
                component="button"
                onClick={() => startTransition(() => setSection(item.key))}
                sx={{
                  appearance: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '0 12px',
                  height: 54,
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: active
                    ? 'var(--ark-inv-text)'
                    : 'var(--ark-text-2)',
                  backgroundColor: active
                    ? 'var(--ark-inv-bg)'
                    : 'var(--ark-seg)',
                  border: '1px solid var(--ark-border)',
                  cursor: 'pointer',
                  transition: 'transform 0.08s ease-out',
                  '&:hover': { color: 'var(--ark-inv-text)' },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                <Box component="span" sx={{ ml: '-4px', display: 'inline-flex' }}>
                  {item.icon}
                </Box>
                {item.label}
              </Box>
            )
          })}

          <Box sx={{ flex: 1 }} />

          <Box
            component="button"
            onClick={onExitApp}
            sx={{
              appearance: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '0 12px',
              height: 48,
              mt: '4px',
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 1,
              color: 'var(--ark-warn)',
              backgroundColor: 'var(--ark-seg)',
              border: '1px solid rgba(255, 96, 24, 0.35)',
              cursor: 'pointer',
              transition: 'transform 0.08s ease-out',
              '&:hover': {
                borderColor: 'var(--ark-warn)',
                backgroundColor: 'rgba(255, 96, 24, 0.08)',
              },
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            <PowerSettingsNewRounded />
            {t('settings.components.verge.advanced.fields.exit')}
          </Box>

          <Typography
            sx={{
              padding: '10px 4px 0',
              fontSize: 11,
              color: 'var(--ark-text-3, #a8a8a8)',
              fontFamily: '"Cascadia Mono", Consolas, monospace',
            }}
          >
            ArClash v{version}
          </Typography>
        </Box>

        <Box
          ref={panelRef}
          sx={{
            flex: 1,
            minWidth: 0,
            borderRadius: 2,
            backgroundColor: 'var(--ark-panel)',
            padding: '14px 20px 24px',
            overflow: 'auto',
            // Fixed viewport height: switching sections swaps content inside a
            // same-sized frame, so the panel's top edge never moves
            // (user report, 11-14).
            height: 'calc(100vh - 140px)',
            minHeight: 380,
          }}
        >
          {/* D1 (user, 11-14): the section swap cross-fades inside the fixed
              frame; the nav and banners stay still. `ark-fade` caps the browser
              default at 180ms. */}
          <ViewTransition enter="ark-fade" exit="ark-fade">
            {section === 'system' && <SettingSystem onError={onError} />}
            {section === 'basic' && <SettingVergeBasic onError={onError} />}
            {section === 'theme' && <SettingTheme onError={onError} />}
            {section === 'advanced' && (
              <SettingVergeAdvanced onError={onError} />
            )}
          </ViewTransition>
        </Box>
      </Box>
    </BasePage>
  )
}

export default SettingPage
