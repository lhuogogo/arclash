import { Paper, ThemeProvider } from '@mui/material'
import { useLockFn } from 'ahooks'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { BaseErrorBoundary } from '@/components/base'
import { ArkDownloadPage } from '@/components/home/ark-download-page'
import { ArkStatusPage } from '@/components/home/ark-status-page'
import {
  ArkSidebar,
  type ArkNavRow,
  type ArkPageKey,
} from '@/components/layout/ark-sidebar'
import { NoticeManager } from '@/components/layout/notice-manager'
import { ServiceMigrationDialog } from '@/components/layout/service-migration-dialog'
import { SysproxyPrivilegeDialog } from '@/components/layout/sysproxy-privilege-dialog'
import {
  WindowControls,
  WindowResizeHandles,
} from '@/components/layout/window-controller'
import { SteampunkToggle } from '@/components/layout/steampunk-toggle'
import { useConnectionData, useConnectionSummaryData } from '@/hooks/use-connection-data'
import { useClashMode } from '@/hooks/use-clash'
import { useI18n } from '@/hooks/use-i18n'
import { useProfiles } from '@/hooks/use-profiles'
import { useSystemState } from '@/hooks/use-system-state'
import { useTrafficData } from '@/hooks/use-traffic-data'
import { useEgressIpInfo } from '@/hooks/use-egress-ip'
import { useDisplayedMixedPort } from '@/hooks/use-displayed-mixed-port'
import { useTunnelSwitch } from '@/hooks/use-tunnel-switch'
import { useGroupDelays } from '@/hooks/use-group-delays'
import { useProxiesData } from '@/providers/app-data-context'
import { resolveCurrentNode } from '@/types/proxy-view'
import { useVerge } from '@/hooks/use-verge'
import { useWindowDecorations } from '@/hooks/use-window'
import { useEventBus } from '@/services/bus'
import { handleNoticeMessage } from '@/services/notice-handlers'
import { showNotice } from '@/services/notice-service'
import { useThemeMode } from '@/services/states'
import { useAppReads } from '@/store/app-store-context'
import getSystem from '@/utils/get-system'
import { formatDelay, latencyClassOf } from '@/utils/latency-tone'

import {
  useCustomTheme,
  useLoadingOverlay,
  usePendingFailures,
} from './_layout/hooks'
import ConnectionsPage from './connections'

import ProfilePage from './profiles'
import ProxyPage from './proxies'
import SettingPage from './settings'

import 'dayjs/locale/ru'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)

const OS = getSystem()

/** Core mode → the English word the home block shows (user 11-13). */
const MODE_EN: Record<string, string> = {
  rule: 'Rule',
  global: 'Global',
  direct: 'Direct',
}

// The core's built-in policies are not nodes a user picked. Its auto-generated
// GLOBAL group ships with `now: 'DIRECT'` before any subscription is imported,
// and rendering that as the armed node read as "the node is DIRECT" (user
// report, 11-13); DIRECT means "no proxy", which 「请选择节点」 states better.
const BUILTIN_POLICY_NAMES = new Set([
  'DIRECT',
  'REJECT',
  'REJECT-DROP',
  'PASS',
  'COMPATIBLE',
  'GLOBAL',
])

/**
 * Renders a latency for display, or undefined when there is nothing honest to
 * show. Re-exported from the latency scale so the block, the node lists and the
 * status page cannot drift to two different formatters.
 */
export { formatDelay }

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)),
  )
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)}${units[i]}`
}

const formatRate = (bytesPerSec = 0) => {
  if (!bytesPerSec) return '0 B/s'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(Math.abs(bytesPerSec)) / Math.log(1024)),
  )
  return `${(bytesPerSec / 1024 ** i).toFixed(1)} ${units[i]}/s`
}

const formatUptime = (startedAt: number) => {  if (!startedAt) return '--:--'
  const total = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Compact uptime for the right-hand status block: `4h12`, or `2d03` past a
 * day. The block is narrow, so the colon form used by the main view does not
 * fit at headline size.
 */
// Uptime headline for the home block. The unit is spelled out because a bare
// "0h13" reads as a clock time, not an elapsed duration; the block has the
// width for it and v9 shows the same figure with a label (`4h12`).
const formatUptimeShort = (startedAt: number) => {
  if (!startedAt) return '--'
  const total = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (d > 0) return `${d}d${String(h).padStart(2, '0')}h`
  return `${h}h${String(m).padStart(2, '0')}m`
}

const Layout = () => {
  const mode = useThemeMode()
  const { t } = useTranslation()
  const { theme } = useCustomTheme()
  const { verge } = useVerge()
  const { runningMode } = useSystemState()
  const { readRunState } = useAppReads()
  const { language } = verge ?? {}
  const { switchLanguage } = useI18n()
  const navigate = useNavigate()
  const themeReady = useMemo(() => Boolean(theme), [theme])
  const windowControlsRef = useRef<any>(null)
  const { decorated } = useWindowDecorations()

  // The main view swaps in place; the right-hand matrix drives which page is
  // shown, so the router no longer decides the visible content.
  const [page, setPage] = useState<ArkPageKey>('status')

  const startedAtRef = useRef<number>(Date.now())
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { response: trafficResult } = useTrafficData({
    enabled: page !== 'download',
  })
  const traffic = trafficResult?.data
  const { response: connSummaryResult } = useConnectionSummaryData({
    enabled: page === 'connections' || page === 'status',
  })
  const activeConnCount =
    connSummaryResult?.data?.activeConnectionCount ?? 0

  // Distinguishes "loaded and zero" from "not loaded yet": the block shows
  // `--` until the first payload arrives instead of a misleading 0.
  const connLoaded = Boolean(connSummaryResult?.data)

  const { response: connDataResult } = useConnectionData({
    enabled: page === 'connections' || page === 'status',
  })
  const closedConnCount =
    connDataResult?.data?.closedConnections?.length ?? 0

  // The matrix blocks carry a muted second line, so each one states a fact the
  // user would otherwise have to open the page to read. Profiles feed the
  // subscription count; the clash mode feeds the settings block.
  const { profiles, current: currentProfile } = useProfiles()
  // Only real subscriptions count. The profile list also carries the global
  // merge (YAML override) and script entries, which are not subscriptions —
  // counting them showed "2 个配置" with no subscription imported at all
  // (`PrfItem.type` is `remote | local | script | merge`).
  //
  // Derived inside the memo: `profiles?.items ?? []` builds a new array on
  // every render, so a filter over it would invalidate the memo each time.
  const subscriptionCount = useMemo(
    () =>
      (profiles?.items ?? []).filter(
        (p) => p?.type === 'remote' || p?.type === 'local',
      ).length,
    [profiles?.items],
  )
  const clashMode = useClashMode(page === 'status' || page === 'settings')
  const modeLabel =
    clashMode?.data === 'global'
      ? '全局'
      : clashMode?.data === 'direct'
        ? '直连'
        : '规则'
  // English name of the mode the core reports, for the home block's mode line.
  // Read from the same source as `modeLabel`, so the two can never disagree.
  const modeEn = MODE_EN[clashMode?.data ?? ''] ?? 'Rule'

  // Current node + latency for the proxies block. The group follows the same
  // selection the home card uses: profile-scoped, falling back to the first
  // selectable group. Delay comes from the shared delay store, with the
  // group's own history as its fallback (getDelayFix handles both).
  const { proxyView } = useProxiesData()
  const selectedGroupName = useMemo(() => {
    const saved =
      typeof window === 'undefined'
        ? null
        : localStorage.getItem('clash-verge-selected-proxy-group')
    if (saved && proxyView?.groups.some((g) => g.name === saved)) return saved
    const first = proxyView?.groups.find(
      (g) => !g.hidden && (g.type === 'Selector' || g.type === 'URLTest'),
    )
    return first?.name ?? null
  }, [proxyView])
  const groupDelays = useGroupDelays(selectedGroupName)
  // The selected node is reported in every mode. In direct mode it is not in
  // use, but hiding it made the page look like the selection had been lost —
  // the user still needs to see which node is armed for when they switch back.
  // `inUse` lets the consumers mute it instead of dropping it.
  const currentProxy = useMemo(() => {
    if (!proxyView) return undefined
    const direct = clashMode?.data === 'direct'
    // Global mode reads the same shape as rule mode: resolve the group's
    // selected member to a node. Returning the group itself would give the
    // block a name but no latency, and the two branches must agree on type.
    const group = direct
      ? selectedGroupName
        ? proxyView.groups.find((g) => g.name === selectedGroupName)
        : undefined
      : clashMode?.data === 'global'
        ? proxyView.global ?? undefined
        : selectedGroupName
          ? proxyView.groups.find((g) => g.name === selectedGroupName)
          : undefined
    // `now` frequently points at a nested selector, not the node itself; stop
    // only when the chase reaches a node, or the node rows blank out in
    // exactly the modes where the outer group delegates (see resolveCurrentNode).
    const found = resolveCurrentNode(proxyView, group)
    if (!found || found.member.kind !== 'node') return undefined
    // A built-in policy as `now` is the core's default, not a selection; the
    // placeholder branch below keeps the row height instead.
    if (BUILTIN_POLICY_NAMES.has(found.member.ref.name)) return undefined
    return {
      name: found.member.ref.name,
      delay: groupDelays.of(found.member),
      inUse: !direct,
    }
  }, [proxyView, clashMode?.data, selectedGroupName, groupDelays])

  // The rail switch and the status card both toggle the managed core, so
  // "connected" has to read the core process. getRuntimeState() reports
  // Service / Sidecar while it runs and NotRunning once stopped; a live
  // connection count would read as disconnected whenever nothing happens to be
  // connected, which is not the same thing.
  const coreRunning = runningMode === 'Service' || runningMode === 'Sidecar'

  // The connect / disconnect switch: toggles the tunnel (system proxy + TUN),
  // not the core process. `stopCore` / `startCore` stay available for service
  // flows but the switch no longer touches them.
  const { tunnelUp, connect, disconnect } = useTunnelSwitch()

  // Egress IP for the home block's node line. Not gated on the core: the row has
  // to keep its height in both states, otherwise the address disappears on
  // disconnect, the row collapses and the button below it jumps.
  //
  // Two different answers, deliberately: while a tunnel carries traffic through
  // a node the probe goes through the core's mixed port, so it reports that
  // node's exit address; disconnected or in direct mode it follows the system
  // proxy stack and reports this machine's own exit. The node's `server` from
  // the subscription is *not* used — it is often a CDN hostname that resolves to
  // the wrong country (real report, 11-13). See `useEgressIpInfo`.
  const mixedPort = useDisplayedMixedPort()
  const viaNode = tunnelUp && clashMode?.data !== 'direct'
  const { data: ipInfo } = useEgressIpInfo(coreRunning, {
    proxyPort: mixedPort,
    nodeKey: currentProxy?.name,
    viaNode,
  })
  const displayIp = ipInfo?.ip
  // Read off the same object the address comes from, so the two can never
  // disagree about which probe answered.
  //
  // The probe picks a provider at random and they disagree about what
  // `country` holds: most return a display name ("Japan"), but the skk.moe
  // endpoint only returns an ISO code ("JP") and its mapping copies that into
  // both fields. The two are therefore treated as separate parts of one label —
  // each is shown when present, and the name is skipped only when it merely
  // repeats the code. Dropping the whole label when they matched would hide the
  // location entirely for that provider (1 draw in 6).
  const egressCountryCode = ipInfo?.country_code
  const rawCountry = ipInfo?.country
  const egressCountry =
    rawCountry && rawCountry !== egressCountryCode ? rawCountry : undefined

  const onToggleTunnel = useLockFn(async () => {
    try {
      if (tunnelUp) {
        await disconnect()
      } else {
        await connect()
      }
    } catch (error) {
      showNotice.error(error as Error)
    }
  })

  const customTitlebar = useMemo(
    () =>
      decorated === false ? (
        <div className="the_titlebar">
          <div
            className="the_titlebar-drag-region"
            data-tauri-drag-region="true"
          />
          <WindowControls ref={windowControlsRef} />
        </div>
      ) : null,
    [decorated],
  )

  useLoadingOverlay(themeReady)

  const handleNotice = useCallback(
    (payload: [string, string]) => {
      const [status, msg] = payload
      try {
        handleNoticeMessage(status, msg, t, navigate)
      } catch (error) {
        console.error('[通知处理] 失败:', error)
      }
    },
    [t, navigate],
  )

  useEventBus(handleNotice)
  usePendingFailures()

  useEffect(() => {
    if (language) {
      dayjs.locale(language === 'zh' ? 'zh-cn' : language)
      switchLanguage(language)
    }
  }, [language, switchLanguage])

  const navRows = useMemo<ArkNavRow[]>(
    () => [
      {
        items: [
          {
            key: 'status',
            label: t('layout.components.navigation.tabs.home'),
            code: 'RS-00',
            // No icon on the home block: the block already carries the uptime
            // headline, the state/mode pair and the address line, and the glyph
            // was the only accent-coloured element in the row. The other five
            // blocks keep theirs, so `.ark-btn__icon` stays in the stylesheet.
            latin: 'STATUS',
            // Layout follows v9's status block (prototype/v9.html:1199-1210,
            // user's reference figure 3): the uptime headline on the left with
            // the state and mode stacked to its right, then one line holding the
            // address and the node. The previous version stacked state, address
            // and node as three separate rows and the block read as a list.
            body: (
              <>
                <span className="ark-row1">
                  <span className="ark-btn__big num">
                    {formatUptimeShort(startedAtRef.current)}
                  </span>
                  <span className="ark-row1__state">
                    <span className="ark-row1__state-txt">
                      {tunnelUp ? '已连接' : '已断开'}
                    </span>
                    <span className="ark-row1__mode">
                      {modeLabel || '--'}
                    </span>
                  </span>
                </span>
                {/* Address keeps its place (user 11-13, corrected): the same
                    address logic as the main view — the node's exit while a
                    tunnel carries traffic, the machine's own when disconnected
                    or direct. Only the *node name* slot changed: it now states
                    the mode in English, so this block never repeats the node
                    that RS-01 already shows. The line always renders so the
                    rows below never move. */}
                <span className="ark-btn__ipline num">
                  {displayIp ? (
                    <>
                      <span className="ark-btn__ip-addr">{displayIp}</span>
                      {egressCountryCode || egressCountry ? (
                        <span className="ark-btn__ip-geo">
                          {egressCountryCode}
                          {egressCountry
                            ? `${egressCountryCode ? ' ' : ''}${egressCountry}`
                            : ''}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span
                      className="ark-btn__ip-addr is-filler"
                      aria-hidden="true"
                    >
                      0.0.0.0
                    </span>
                  )}
                  <span className="ark-btn__node">
                    <span className="ark-btn__mode-en">
                      {tunnelUp ? modeEn : 'Disconnect'}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  className={`ark-btn__cta${tunnelUp ? ' is-raid' : ''}`}
                  onClick={(event) => {
                    // The block itself navigates; this switch must not.
                    event.stopPropagation()
                    void onToggleTunnel()
                  }}
                  aria-label={tunnelUp ? '断开代理连接' : '恢复代理连接'}
                  title={
                    tunnelUp ? '关闭系统代理和 TUN' : '恢复系统代理或 TUN'
                  }
                >
                  <span className="ark-btn__cta-badge" aria-hidden="true">
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke={tunnelUp ? '#C24A38' : '#19b4e2'}
                      strokeWidth="1.8"
                      strokeLinecap="square"
                    >
                      {/* 断开态（「连 接」）画勾=去连接；已连接态（「断 开」）
                          画叉=去断开（用户 11-14）。 */}
                      <path
                        d={
                          tunnelUp
                            ? 'M1.5 1.5l7 7M8.5 1.5l-7 7'
                            : 'M1.5 5.4l2.5 2.5 4.4-5.6'
                        }
                      />
                    </svg>
                  </span>
                  <span className="ark-btn__cta-txt">
                    {tunnelUp ? '断 开' : '连 接'}
                  </span>
                </button>
              </>
            ),
          },
        ],
      },
      {
        items: [
          {
            key: 'proxies',
            label: t('layout.components.navigation.tabs.proxies'),
            code: 'RS-01',
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <circle cx="8" cy="3" r="1.8" />
                <circle cx="3" cy="12.5" r="1.8" />
                <circle cx="13" cy="12.5" r="1.8" />
                <path d="M7.2 4.6L3.8 11M8.8 4.6l3.4 6.4" />
              </svg>
            ),
            latin: 'PROXIES',
            // Node name + latency tone, always on one line: an absent node
            // reads 「请选择节点」 at the same height instead of collapsing the
            // card and moving everything below it (user report, 11-13).
            body: (
              <span className="ark-proxyline">
                <span
                  className={`ark-proxyline__name${
                    currentProxy ? '' : ' is-placeholder'
                  }`}
                >
                  {currentProxy ? currentProxy.name : '请选择节点'}
                </span>
                {currentProxy?.delay != null &&
                formatDelay(currentProxy.delay) ? (
                  <span
                    className={`${latencyClassOf(currentProxy.delay) ?? ''} ark-proxyline__ms num`}
                  >
                    {formatDelay(currentProxy.delay)}
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            key: 'profiles',
            label: t('layout.components.navigation.tabs.profiles'),
            code: 'RS-02',
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <rect x="2.5" y="5" width="11" height="8" />
                <path d="M4.5 3h7" />
              </svg>
            ),
            latin: 'PROFILES',
            // A subscription name is the point of this block; with none
            // imported the count reads "无" rather than "0 个配置", which
            // looked like a loaded profile set of zero.
            //
            // Bright, unlike the settings block's muted mode name: here the
            // selected subscription is the block's subject, not a secondary
            // fact, so it reads at full strength like the block title.
            sublabel:
              currentProfile?.name ??
              (subscriptionCount
                ? `${subscriptionCount} 个订阅`
                : '无'),
            sublabelBright: true,
          },
        ],
      },
      {
        items: [
          {
            key: 'connections',
            label: t('layout.components.navigation.tabs.connections'),
            code: 'RS-03',
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <path d="M2 5.5h10M9.5 3l2.5 2.5L9.5 8" />
                <path d="M14 10.5H4M6.5 8L4 10.5 6.5 13" />
              </svg>
            ),
            latin: 'CONNS',
            // No trailing/sublabel: the count is rendered once inside body.
            // Request and DNS counters have no data source in
            // useConnectionSummaryData (it only carries `count`), so only the
            // two figures that are actually available are shown.
            body: (
              <span className="ark-cols">
                <span className="ark-cols__cell">
                  <span className="ark-cols__n num">
                    {connLoaded ? activeConnCount : '--'}
                  </span>
                  <span className="ark-cols__l">连接</span>
                </span>
                <span className="ark-cols__cell">
                  <span className="ark-cols__n num">
                    {connLoaded ? closedConnCount : '--'}
                  </span>
                  <span className="ark-cols__l">已关闭</span>
                </span>
              </span>
            ),
          },
        ],
      },
      {
        items: [
          {
            key: 'download',
            label: '下载速度',
            code: 'RS-04',
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <path d="M8 2v8M5 7.5L8 10.5l3-3" />
                <path d="M2.5 12.5h11" />
              </svg>
            ),
            latin: 'TRAFFIC',
            // Live speed headline. The blue progress bar that sat under it was
            // removed by request, and the row-height rule below carries the
            // block: with nothing else to show, the headline alone reads clean.
            body: (
              <span className="ark-btn__big num ark-btn__big--speed">
                {traffic ? formatRate(traffic.down) : '--'}
              </span>
            ),
          },
          {
            key: 'settings',
            label: '高级设置',
            code: 'RS-05',
            icon: (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              >
                <path d="M2 4.5h12M2 8h12M2 11.5h12" />
                <circle
                  cx="6"
                  cy="4.5"
                  r="1.5"
                  fill="var(--ark-panel, #373737)"
                />
                <circle
                  cx="10"
                  cy="8"
                  r="1.5"
                  fill="var(--ark-panel, #373737)"
                />
                <circle
                  cx="5"
                  cy="11.5"
                  r="1.5"
                  fill="var(--ark-panel, #373737)"
                />
              </svg>
            ),
            latin: 'SETTINGS',
          },
        ],
      },
    ],
    [
      t,
      traffic,
      activeConnCount,
      connLoaded,
      closedConnCount,
      modeLabel,
      currentProfile,
      subscriptionCount,
      currentProxy,
      tunnelUp,
      displayIp,
      egressCountry,
      egressCountryCode,
      onToggleTunnel,
    ],
  )

  if (!themeReady) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: mode === 'light' ? '#fff' : '#181a1b',
          transition: 'background 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: mode === 'light' ? '#333' : '#fff',
        }}
      ></div>
    )
  }

  // Pages kept out of the six-block matrix stay reachable through the
  // existing router, so nothing that worked before is lost.
  const renderPage = () => {
    switch (page) {
      case 'proxies':
        return <ProxyPage onNavigate={setPage} />
      case 'profiles':
        return <ProfilePage />
      case 'connections':
        return <ConnectionsPage />
      case 'settings':
        return <SettingPage />
      case 'download':
        return <ArkDownloadPage />
      case 'status':
      default:
        return (
          <ArkStatusPage
            startedAt={startedAtRef.current}
            currentProxy={currentProxy}
            egressIp={displayIp}
            egressCountry={egressCountry}
            egressCountryCode={egressCountryCode}
          />
        )
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <NoticeManager position={verge?.notice_position} />
      <ServiceMigrationDialog />
      <SysproxyPrivilegeDialog />
      <style>
        {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}
      </style>
      <Paper
        square
        elevation={0}
        className={`${OS} ark-shell`}
        style={{
          borderTopLeftRadius: '0px',
          borderTopRightRadius: '0px',
        }}
        onContextMenu={(e) => {
          if (
            OS === 'windows' &&
            !['input', 'textarea'].includes(
              e.currentTarget.tagName.toLowerCase(),
            ) &&
            !e.currentTarget.isContentEditable
          ) {
            e.preventDefault()
          }
        }}
        sx={[
          ({ palette }) => ({ bgcolor: palette.background.paper }),
          OS === 'linux'
            ? {
                borderRadius: '8px',
                width: '100vw',
                height: '100vh',
              }
            : {},
        ]}
      >
        {decorated === false && <WindowResizeHandles />}

        {customTitlebar}

        <div className="ark-body">
          <aside className="ark-rail" aria-label="运行状态">
            <div>
              <div className="ark-rail__uptime">
                {formatUptime(startedAtRef.current)}
              </div>
              <div className="ark-rail__uptime-label">已运行</div>
            </div>
            {/* Power switch, matching v9's rail button (prototype/v9.html:776):
                a 38px cut-corner square with the power glyph, no label. v9 has
                two disconnect controls on purpose — this rail switch and the
                labelled one inside the status card (:1208) — so this slot is a
                real control, not a duplicate to remove. The previous ✕ here was
                broken because it only called closeAllConnections() and left the
                tunnel switch; both flip the system proxy / TUN pair, not the core. */}
            <SteampunkToggle
              on={tunnelUp}
              onToggle={() => void onToggleTunnel()}
              labelOn="关闭系统代理和 TUN"
              labelOff="恢复系统代理或 TUN"
              titleOn="关闭系统代理和 TUN"
              titleOff="启动内核，恢复连接"
            />
            <div className="ark-rail__traffic">
              <div>↓ {formatBytes(traffic?.downTotal)}</div>
              <div>↑ {formatBytes(traffic?.upTotal)}</div>
            </div>
          </aside>

          <main className="ark-main">
            <BaseErrorBoundary>
              <div className="ark-page is-active">{renderPage()}</div>
            </BaseErrorBoundary>
          </main>

          <ArkSidebar rows={navRows} active={page} onNavigate={setPage} />
        </div>
      </Paper>
    </ThemeProvider>
  )
}

export default Layout
