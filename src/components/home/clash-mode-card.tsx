import {
  DirectionsRounded,
  LanguageRounded,
  MultipleStopRounded,
} from '@mui/icons-material'
import { Box, Paper, Popper, Stack, Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import {
  type ReactNode,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  ViewTransition,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { BaseConfig } from 'tauri-plugin-mihomo-api'

import { useClashMode, useRuntimeConfig } from '@/hooks/use-clash'
import {
  useAppRefreshers,
  useClashConfigData,
  useCoreDataStatus,
} from '@/providers/app-data-context'
import { useSyncGlobalSelection } from '@/hooks/use-sync-global-selection'
import { patchClashMode } from '@/services/cmds'
import { mutate } from '@/services/mutate'
import { showNotice } from '@/services/notice-service'
import { setCacheData } from '@/services/query-client'
import type { TranslationKey } from '@/types/generated/i18n-keys'

const CLASH_MODES = ['rule', 'global', 'direct'] as const
type ClashMode = (typeof CLASH_MODES)[number]

/**
 * Dwell time before a hint appears.
 *
 * A pointer crossing the row must not spray hints, so nothing shows until the
 * pointer has rested this long. Keyboard focus skips the delay: a keyboard user
 * has already committed to the control, and making them wait for text they
 * cannot see yet is a worse experience than a brief flash.
 */
const HOVER_DELAY_MS = 500

const isClashMode = (mode: string): mode is ClashMode =>
  (CLASH_MODES as readonly string[]).includes(mode)

const toClashMode = (mode?: string | null) => {
  const normalized = mode?.toLowerCase()
  return normalized && isClashMode(normalized) ? normalized : undefined
}

const MODE_META: Record<
  ClashMode,
  { label: TranslationKey; description: TranslationKey }
> = {
  rule: {
    label: 'home.components.clashMode.labels.rule',
    description: 'home.components.clashMode.descriptions.rule',
  },
  global: {
    label: 'home.components.clashMode.labels.global',
    description: 'home.components.clashMode.descriptions.global',
  },
  direct: {
    label: 'home.components.clashMode.labels.direct',
    description: 'home.components.clashMode.descriptions.direct',
  },
}

const MODE_ICONS: Record<ClashMode, ReactNode> = {
  rule: <MultipleStopRounded fontSize="small" />,
  global: <LanguageRounded fontSize="small" />,
  direct: <DirectionsRounded fontSize="small" />,
}

export const ClashModeCard = () => {
  const { t } = useTranslation()
  const { clashConfig } = useClashConfigData()
  const { isCoreDataPending } = useCoreDataStatus()
  const { refreshClashConfig } = useAppRefreshers()

  const [optimisticMode, setOptimisticMode] = useState<ClashMode | null>(null)
  // Pointer hover is the anchor for the hint; keyboard focus is tracked
  // separately so the two cannot fight over one slot.
  const [hoveredMode, setHoveredMode] = useState<ClashMode | null>(null)
  const [focusedMode, setFocusedMode] = useState<ClashMode | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Popper needs the live element as `anchorEl`. A ref callback writes into a
  // stable object so re-renders keep the same anchors.
  const anchorsRef = useRef<Partial<Record<ClashMode, HTMLDivElement>>>({})
  // True between pointerdown and pointerup, so the focus that a click triggers
  // can be told apart from a real keyboard focus.
  const pointerDownRef = useRef(false)

  const controllerMode = toClashMode(clashConfig?.mode)
  const needFallback = !controllerMode
  const { data: runtimeConfig, isPending: isRuntimeConfigPending } =
    useRuntimeConfig(needFallback)
  const runtimeMode = toClashMode(runtimeConfig?.mode)
  const {
    data: backendMode,
    isPending: isBackendModePending,
    refetch: refetchBackendMode,
  } = useClashMode(needFallback)
  // Saved config is refreshed on mode changes; runtime config may be stale.
  const fallbackMode = toClashMode(backendMode) ?? runtimeMode

  const resolvedMode = controllerMode ?? fallbackMode
  const currentMode = optimisticMode ?? resolvedMode

  // The description is no longer always on screen, so the "cannot reach the
  // core" message had nowhere to live. It only replaces the per-mode hints when
  // the mode itself could not be resolved — while a known mode is selected the
  // buttons can do their job and each still needs its own explanation. Pending
  // keeps the hints empty rather than claiming a failure that has not happened.
  const unresolvedHint =
    currentMode ||
    isCoreDataPending ||
    isRuntimeConfigPending ||
    isBackendModePending
      ? null
      : t('home.components.clashMode.errors.communication')

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  useEffect(() => clearHoverTimer, [clearHoverTimer])

  const onHoverStart = useCallback(
    (mode: ClashMode) => {
      clearHoverTimer()
      hoverTimerRef.current = setTimeout(() => {
        startTransition(() => setHoveredMode(mode))
        hoverTimerRef.current = null
      }, HOVER_DELAY_MS)
    },
    [clearHoverTimer],
  )

  // Leaving hides immediately, including a half-finished dwell.
  const onHoverEnd = useCallback(() => {
    clearHoverTimer()
    startTransition(() => setHoveredMode(null))
  }, [clearHoverTimer])

  const syncGlobalSelection = useSyncGlobalSelection()

  const onChangeMode = useLockFn(async (mode: ClashMode) => {
    if (mode === currentMode) return

    setOptimisticMode(mode)
    try {
      await mutate(() => patchClashMode(mode), {
        id: 'patch-clash-mode',
        errorNotice: false,
      })
    } catch (error) {
      setOptimisticMode(null)
      showNotice.error(error)
      return
    }

    // Write through the live cache to avoid flashing the old mode during refetch.
    setCacheData<BaseConfig>(['getClashConfig'], (old) =>
      old ? { ...old, mode } : old,
    )
    // Carry the rule-mode pick into GLOBAL so switching to global mode keeps
    // routing through the node the user chose (user decision, option B).
    await syncGlobalSelection(mode)
    await Promise.allSettled([refreshClashConfig(), refetchBackendMode()])
    setOptimisticMode(null)
  })

  const buttonStyles = (mode: ClashMode) => ({
    cursor: 'pointer',
    px: 2,
    py: 1.2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    bgcolor: mode === currentMode ? 'primary.main' : 'background.paper',
    color: mode === currentMode ? 'primary.contrastText' : 'text.primary',
    borderRadius: 1.5,
    transition: 'background-color 0.2s ease-in-out',
    position: 'relative',
    '&:hover': {
      boxShadow: 1,
    },
  })

  // The hint is portalled to `body` by Popper, so it is not clipped by any
  // ancestor `overflow` and cannot be painted under a later sibling. The
  // previous absolutely-positioned version rendered correctly but sat beneath
  // `.ark-actions` — every sample point inside its rectangle hit `tun-btn`.
  const hintFor = focusedMode ?? hoveredMode
  const hintText = hintFor
    ? (unresolvedHint ?? t(MODE_META[hintFor].description))
    : ''

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          display: 'flex',
          // Left-aligned: the group reads as a row of controls attached to the
          // left edge, not as a centred toolbar.
          justifyContent: 'flex-start',
          py: 1,
          position: 'relative',
        }}
      >
        {CLASH_MODES.map((mode) => {
          const open = hintFor === mode
          return (
            <Box key={mode} sx={{ display: 'flex' }}>
              <Paper
                ref={(node: HTMLDivElement | null) => {
                  if (node) anchorsRef.current[mode] = node
                }}
                elevation={mode === currentMode ? 2 : 0}
                onClick={() => onChangeMode(mode)}
                aria-pressed={mode === currentMode}
                // A Paper is not focusable; these make the keyboard able to
                // reach the hint, which is the only way to reveal it without a
                // pointer.
                role="button"
                tabIndex={0}
                aria-describedby={open ? `clash-mode-desc-${mode}` : undefined}
                onFocus={() => {
                  // A click also focuses the Paper. Pointer users already get
                  // their feedback from the mode changing, and a pinned hint
                  // after a click reads as a stuck tooltip, so a
                  // pointer-initiated focus is ignored here. Keyboard activation
                  // keeps the hint — there it is the only confirmation.
                  if (pointerDownRef.current) return
                  startTransition(() => setFocusedMode(mode))
                }}
                onBlur={() =>
                  startTransition(() =>
                    setFocusedMode((prev) => (prev === mode ? null : prev)),
                  )
                }
                onMouseEnter={() => onHoverStart(mode)}
                onMouseLeave={onHoverEnd}
                onPointerDown={() => {
                  pointerDownRef.current = true
                  clearHoverTimer()
                  startTransition(() => {
                    setFocusedMode(null)
                    setHoveredMode(null)
                  })
                }}
                onPointerUp={() => {
                  // The click's focus has landed by now; clear the flag so the
                  // next keyboard focus is honoured.
                  pointerDownRef.current = false
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    void onChangeMode(mode)
                  }
                }}
                sx={buttonStyles(mode)}
              >
                {MODE_ICONS[mode]}
                <Typography
                  variant="body2"
                  sx={{
                    textTransform: 'capitalize',
                    fontWeight: mode === currentMode ? 600 : 400,
                  }}
                >
                  {t(MODE_META[mode].label)}
                </Typography>
              </Paper>

              <Popper
                open={open}
                anchorEl={anchorsRef.current[mode]}
                placement="top-start"
                // Above the MUI modal layer so no later sibling can paint over
                // it; the previous failure was exactly this.
                sx={{ zIndex: 1400, pointerEvents: 'none' }}
                modifiers={[
                  { name: 'offset', options: { offset: [0, -6] } },
                  { name: 'preventOverflow', options: { padding: 8 } },
                ]}
              >
                {/* A ViewTransition needs to be the first DOM node inside its
                    boundary for enter/exit to fire, so it wraps the surface
                    rather than sitting inside it. The pop-in is driven by the
                    `hint-pop` classes in ark-status.scss; unsupported browsers
                    simply never start a transition and show the element. */}
                <ViewTransition
                  enter="hint-pop"
                  exit="hint-pop-out"
                  default="none"
                >
                  <Box
                    id={`clash-mode-desc-${mode}`}
                    sx={{
                      maxWidth: 260,
                      p: 0.8,
                      color: 'text.secondary',
                      backgroundColor: 'background.paper',
                      borderColor: 'primary.main',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderRadius: 1,
                      boxShadow: 2,
                      wordBreak: 'break-word',
                    }}
                  >
                    <Typography variant="caption" component="span">
                      {hintText}
                    </Typography>
                  </Box>
                </ViewTransition>
              </Popper>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
