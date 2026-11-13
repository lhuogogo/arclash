import { Box, Button, Stack } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { useSystemState } from '@/hooks/use-system-state'
import { useAppRefreshers } from '@/providers/app-data-context'
import { openLogsDir, restartCore } from '@/services/cmds'
import { mutate } from '@/services/mutate'

import type { ProxyEmptyStateReason } from './proxy-empty-state-model'

interface Props {
  reason: ProxyEmptyStateReason
  /**
   * Switch the ArClash shell to another block. The shell keeps its page in
   * state rather than in the URL, so a router navigation changes the address
   * bar and leaves the UI where it was — which is exactly why 「前往订阅」 did
   * nothing (user report, 11-13). The shell passes this down.
   */
  onNavigate?: (page: 'profiles') => void
}

export const ProxyEmptyState = ({ reason, onNavigate }: Props) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refreshProxy } = useAppRefreshers()
  const { mutateSystemState } = useSystemState()
  const [isRestarting, setIsRestarting] = useState(false)

  const handleRestart = useLockFn(async () => {
    setIsRestarting(true)
    try {
      await mutate(() => restartCore(), { id: 'restart-core' })
      await Promise.all([refreshProxy(), mutateSystemState()])
    } catch {
      // the funnel already notified
    } finally {
      setIsRestarting(false)
    }
  })

  const goToProfiles = () => {
    // Prefer the shell's own navigation; fall back to the router only when the
    // shell did not provide one (e.g. this component rendered on its own).
    if (onNavigate) {
      onNavigate('profiles')
      return
    }
    navigate('/profile')
  }

  const title =
    reason === 'no-subscriptions'
      ? t('proxies.page.empty.noSubscriptions.title')
      : reason === 'inactive-subscription'
        ? t('proxies.page.empty.inactiveSubscription.title')
        : reason === 'core-unavailable'
          ? t('proxies.page.empty.coreUnavailable.title')
          : t('proxies.page.empty.noProxyInfo.title')
  const description =
    reason === 'no-subscriptions'
      ? t('proxies.page.empty.noSubscriptions.description')
      : reason === 'inactive-subscription'
        ? t('proxies.page.empty.inactiveSubscription.description')
        : reason === 'core-unavailable'
          ? t('proxies.page.empty.coreUnavailable.description')
          : t('proxies.page.empty.noProxyInfo.description')
  const showProfiles =
    reason === 'no-subscriptions' ||
    reason === 'inactive-subscription' ||
    reason === 'no-proxy-info'
  const showCoreActions =
    reason === 'core-unavailable' || reason === 'no-proxy-info'

  return (
    // Centred in the viewport and free to shrink. The re-measure (11-13) showed
    // the real clipping culprit: the theme leaves boxes on `content-box`, so
    // this flex row's `width: 100%` plus its side padding totalled 48px past
    // the content area's right edge. `border-box` draws the padding inside the
    // width; `px: 2` keeps the left gap the user asked to shrink.
    <Box
      sx={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 2,
        overflow: 'auto',
      }}
    >
      {/* Same well as the core block in the main view (`.ark-core`): dark
          inset panel, 1px hairline. The theme's global `box-shadow: none
          !important` erases inset shadows, so the border is drawn with a real
          border here instead. */}
      <Box
        sx={{
          boxSizing: 'border-box',
          width: 'min(440px, 100%)',
          maxHeight: '100%',
          overflow: 'auto',
          p: '10px 12px',
          backgroundColor: 'var(--ark-well, #1e1f1f)',
          border: '1px solid var(--ark-border, rgba(255,255,255,0.14))',
          borderRadius: 0,
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: 'var(--ark-text, #fff)',
          }}
        >
          {title}
        </Box>

        <Box
          sx={{
            mt: '6px',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--ark-text-3, #a8a8a8)',
            wordBreak: 'break-word',
          }}
        >
          {description}
        </Box>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ mt: 1.5, flexWrap: 'wrap' }}
        >
          {showProfiles && (
            <Button
              size="small"
              variant="contained"
              onClick={goToProfiles}
              sx={{ borderRadius: 0, fontSize: 13 }}
            >
              {t('proxies.page.empty.actions.openProfiles')}
            </Button>
          )}

          {showCoreActions && (
            <>
              <Button
                size="small"
                variant="contained"
                loading={isRestarting}
                onClick={() => void handleRestart()}
                sx={{ borderRadius: 0, fontSize: 13 }}
              >
                {t('proxies.page.empty.actions.restartCore')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={isRestarting}
                onClick={() => void openLogsDir()}
                sx={{ borderRadius: 0, fontSize: 13 }}
              >
                {t('proxies.page.empty.actions.openLogs')}
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
