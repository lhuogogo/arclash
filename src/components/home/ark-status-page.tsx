import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ArkTunButton } from '@/components/home/ark-tun-button'
import { ClashModeCard } from '@/components/home/clash-mode-card'
import { useClash } from '@/hooks/use-clash'
import { useConnectionSummaryData } from '@/hooks/use-connection-data'
import { useMemoryData } from '@/hooks/use-memory-data'
import { useSystemState } from '@/hooks/use-system-state'
import { useTrafficData } from '@/hooks/use-traffic-data'
import { useVerge } from '@/hooks/use-verge'

import { formatDelay, latencyClassOf } from '@/utils/latency-tone'

/**
 * Status page for the ArClash shell.
 *
 * Mirrors prototype/v6.html `[data-page="status"]`: connection headline,
 * three data bars, session facts, core block, rule hits, then the TUN switch
 * and the three-way mode switch.
 *
 * The TUN and mode controls are not reimplemented here. `ProxyTunCard` and
 * `ClashModeCard` already call the real backend (`patchVerge({enable_tun_mode})`
 * and `patchClashMode(mode)`) with optimistic updates and rollback, so this
 * page only places them.
 *
 * Layout constraint: TUN and the three mode buttons must sit on separate rows.
 * Side by side, TUN takes ~150px of the 442px content width, leaving ~96px per
 * mode button, which forces "规则" onto two lines.
 */

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)),
  )
  const v = bytes / 1024 ** i
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const formatRate = (bytesPerSec = 0) => {
  if (!bytesPerSec) return '0'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(Math.abs(bytesPerSec)) / Math.log(1024)),
  )
  return `${(bytesPerSec / 1024 ** i).toFixed(1)} ${units[i]}/s`
}

const formatUptime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(h)}:${p(m)}:${p(s)}`
}

export const ArkStatusPage = ({
  startedAt,
  currentProxy,
  egressIp,
  egressCountry,
  egressCountryCode,
}: {
  startedAt: number
  /** Selected node and its latency, resolved by the layout. */
  currentProxy?: { name: string; delay?: number; inUse?: boolean }
  /** Tunnel egress address, only provided while the core runs. */
  egressIp?: string
  /** Country name reported by the same probe that produced `egressIp`. */
  egressCountry?: string
  /** ISO code for the flag beside the country name. */
  egressCountryCode?: string
}) => {
  const { t } = useTranslation()
  const { verge } = useVerge()
  const { response: trafficResult } = useTrafficData()
  const { response: connSummaryResult } = useConnectionSummaryData()
  const { version: coreVersion } = useClash()
  const { runningMode } = useSystemState()
  const {
    response: { data: memory },
  } = useMemoryData()
  const traffic = trafficResult?.data
  const activeCount = connSummaryResult?.data?.activeConnectionCount ?? 0

  // Disconnect stops the managed core outright, so the tunnel really goes down
  // and every live connection with it. "Connected" therefore reads the core
  // process, not the proxy flags: getRuntimeState() reports Service / Sidecar
  // while it runs and NotRunning once stopped.
  //
  // The switch itself lives in the home block, not here: v9 keeps one control
  // in the status block and this page only reports the state it produces.
  const isRunning = runningMode === 'Service' || runningMode === 'Sidecar'

  const uptime = formatUptime(Date.now() - startedAt)

  // Bar widths are relative to the larger of up/down so the pair reads as a
  // ratio rather than two unrelated percentages.
  const bars = useMemo(() => {
    const down = traffic?.down ?? 0
    const up = traffic?.up ?? 0
    const peak = Math.max(down, up, 1)
    const total = (traffic?.downTotal ?? 0) + (traffic?.upTotal ?? 0)
    return {
      downPct: Math.round((down / peak) * 100),
      upPct: Math.round((up / peak) * 100),
      totalPct: total ? 34 : 0,
    }
  }, [traffic])

  return (
    <div className="ark-status">
      <div className="ark-status__eyebrow en">STATUS / RS-00</div>
      <div className={`ark-status__title${isRunning ? '' : ' is-off'}`}>
        {isRunning ? '已 连 接' : '已 断 开'}
      </div>
      {/* Address and location first, then the selected node — same order as the
          home block, so the two read as one design rather than two layouts.
          The IP is only passed in while the core runs; see `useEgressIpInfo`. */}
      {/* Address and location first, then the selected node — same order as the
          home block, so the two read as one design rather than two layouts.
          Both rows always render: letting them collapse when empty made
          everything below jump between modes (user report, 11-13), so an empty
          row is held open by invisible filler at the same height instead. */}
      <div className="ark-status__ip num">
        {egressIp ? (
          <>
            <span className="ark-status__ip-addr">{egressIp}</span>
            {/* Country in every mode — see the note in `_layout.tsx`. Direct mode
                used to substitute 「本地」, which read as a different kind of data
                rather than the same fact over a different route. */}
            {egressCountryCode || egressCountry ? (
              <span className="ark-status__ip-geo">
                {egressCountryCode}
                {egressCountry
                  ? `${egressCountryCode ? ' ' : ''}${egressCountry}`
                  : ''}
              </span>
            ) : null}
          </>
        ) : (
          <span className="ark-status__ip-addr is-filler" aria-hidden="true">
            0.0.0.0
          </span>
        )}
      </div>
      <div className="ark-status__node">
        <span
          className={`ark-status__node-name${
            currentProxy ? '' : ' is-placeholder'
          }`}
        >
          {currentProxy ? currentProxy.name : '请选择节点'}
        </span>
        {currentProxy?.delay != null && formatDelay(currentProxy.delay) ? (
          <span
            className={`${latencyClassOf(currentProxy.delay) ?? ''} ark-status__node-ms num`}
          >
            {formatDelay(currentProxy.delay)}
          </span>
        ) : null}
        {currentProxy?.inUse === false ? (
          <span className="ark-status__node-tag">未启用</span>
        ) : null}
      </div>

      <div className="ark-strip">
        <div className="ark-strip__cell">
          <div className="ark-strip__label">下行</div>
          <div className="ark-strip__num">
            {formatRate(traffic?.down)}
          </div>
          <div className="ark-strip__bar">
            <i style={{ width: `${bars.downPct}%` }} />
          </div>
        </div>
        <div className="ark-strip__cell">
          <div className="ark-strip__label">上行</div>
          <div className="ark-strip__num">{formatRate(traffic?.up)}</div>
          <div className="ark-strip__bar">
            <i style={{ width: `${bars.upPct}%` }} />
          </div>
        </div>
        <div className="ark-strip__cell">
          <div className="ark-strip__label">今日总计</div>
          <div className="ark-strip__num">
            {formatBytes((traffic?.downTotal ?? 0) + (traffic?.upTotal ?? 0))}
          </div>
          <div className="ark-strip__bar">
            <i style={{ width: `${bars.totalPct}%` }} />
          </div>
        </div>
      </div>

      <div className="ark-info">
        <div className="ark-info__row">
          <span className="ark-info__k">UPTIME</span>
          <span className="ark-info__v num">{uptime}</span>
        </div>
        <div className="ark-info__row">
          <span className="ark-info__k">CONNS</span>
          <span className="ark-info__v num">{activeCount}</span>
        </div>
        <div className="ark-info__row">
          <span className="ark-info__k">MIXED</span>
          <span className="ark-info__v num">{verge?.verge_mixed_port ?? '-'}</span>
        </div>
        <div className="ark-info__row">
          <span className="ark-info__k">TUN</span>
          <span className="ark-info__v">
            {verge?.enable_tun_mode ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Core block. Only fields with a real source are shown. Kernel PID and
          process CPU have no frontend API, so they are omitted rather than
          filled with placeholder numbers. */}
      <div className="ark-core">
        <div className="ark-core__head">
          <span className="ark-core__title">内核</span>
          <span className="ark-core__badge en">CORE</span>
        </div>
        <div className="ark-core__grid">
          <div className="ark-core__cell">
            <span className="ark-core__k">版本</span>
            <span className="ark-core__v num">{coreVersion || '-'}</span>
          </div>
          <div className="ark-core__cell">
            <span className="ark-core__k">运行方式</span>
            <span className="ark-core__v">
              {runningMode === 'Service'
                ? 'Service'
                : runningMode === 'Sidecar'
                  ? 'Sidecar'
                  : '—'}
            </span>
          </div>
          <div className="ark-core__cell">
            <span className="ark-core__k">状态</span>
            <span className={`ark-core__v${isRunning ? ' on' : ' off'}`}>
              {isRunning ? '运行中' : '已停止'}
            </span>
          </div>
          <div className="ark-core__cell">
            <span className="ark-core__k">内存</span>
            <span className="ark-core__v num">{formatBytes(memory?.inuse)}</span>
          </div>
          <div className="ark-core__cell">
            <span className="ark-core__k">混合端口</span>
            <span className="ark-core__v num">
              {verge?.verge_mixed_port ?? '-'}
            </span>
          </div>
          <div className="ark-core__cell">
            <span className="ark-core__k">启动于</span>
            <span className="ark-core__v num">
              {new Date(startedAt).toLocaleTimeString('zh-CN', {
                hour12: false,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* TUN and mode switch stay on separate rows: side by side the mode
          buttons shrink to ~96px and wrap their labels. */}
      <div className="ark-actions">
        <div className="ark-actions__tun">
          <ArkTunButton />
        </div>
        <div className="ark-actions__modes">
          <ClashModeCard />
        </div>
      </div>
    </div>
  )
}

export default ArkStatusPage
