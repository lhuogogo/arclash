import { useMemo, useState } from 'react'

import { useConnectionData } from '@/hooks/use-connection-data'
import { useTrafficData } from '@/hooks/use-traffic-data'
import { useTrafficGraphDataEnhanced } from '@/hooks/use-traffic-monitor'

/**
 * Download / usage page for the ArClash shell.
 *
 * Mirrors `prototype/v9.html` `[data-page="download"]` in layout.
 *
 * Two of its parts cannot be filled from what the frontend already holds, and
 * say so instead of showing plausible numbers:
 *
 * - The 24h / 7d / 30d range tabs. The sampler keeps 10 minutes of raw samples
 *   and 60 minutes compressed (`WORKER_CONFIG` in `use-traffic-monitor`), so
 *   only the 1-hour view can be drawn.
 *
 * The other two dimensions are real: every active connection already carries
 * its own `download` / `upload` byte counts plus `metadata.host` and
 * `chains`, so grouping those gives the v9 breakdown without any new backend
 * call. The 设备 and 进程 dimensions were removed by request (11-13): the
 * former had no data source at all, the latter was cut with the tab.
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

// The only range the sampler can serve; see the header comment.
const RANGES = [
  { key: 'hour', label: '1 小时', minutes: 60, available: true },
  { key: 'day', label: '24 小时', minutes: 1440, available: false },
  { key: 'week', label: '7 天', minutes: 10080, available: false },
  { key: 'month', label: '30 天', minutes: 43200, available: false },
] as const

type Dimension = 'host' | 'chain'

// 设备 and 进程 were removed by request (11-13); only the two dimensions with
// a real data source stay.
const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: 'host', label: '域名' },
  { key: 'chain', label: '代理' },
]

// Groups the live connection list by one metadata field and sums its bytes.
const groupBy = (
  items: IConnectionsItem[],
  pick: (item: IConnectionsItem) => string | undefined,
) => {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = pick(item)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + item.download + item.upload)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, bytes]) => ({ name, bytes }))
}

export const ArkDownloadPage = () => {
  const { response: trafficResult } = useTrafficData()
  const { response: connResult } = useConnectionData()
  const { dataPoints, requestRange } = useTrafficGraphDataEnhanced()
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('hour')
  const [dimension, setDimension] = useState<Dimension>('host')

  const traffic = trafficResult?.data
  const connections = connResult?.data

  const sessions =
    (connections?.activeConnections.length ?? 0) +
    (connections?.closedConnections.length ?? 0)

  const totals = useMemo(() => {
    const up = traffic?.upTotal ?? 0
    const down = traffic?.downTotal ?? 0
    return { up, down, total: up + down }
  }, [traffic])

  const breakdown = useMemo(() => {
    const active = connections?.activeConnections ?? []
    if (dimension === 'host') return groupBy(active, (i) => i.metadata.host)
    return groupBy(active, (i) => i.chains[0])
  }, [connections, dimension])

  const peak = breakdown[0]?.bytes ?? 0

  // Normalise the sample series to a 0..100 viewBox height. An empty series
  // draws nothing rather than a flat line at zero, which would read as "no
  // traffic measured" instead of "no samples yet".
  const chart = useMemo(() => {
    if (!dataPoints.length) return null
    const max = Math.max(...dataPoints.map((p) => Math.max(p.up, p.down)), 1)
    const toPath = (pick: (p: ITrafficDataPoint) => number) =>
      dataPoints
        .map((p, i) => {
          const x =
            dataPoints.length === 1 ? 0 : (i / (dataPoints.length - 1)) * 300
          const y = 100 - (pick(p) / max) * 100
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
        })
        .join(' ')
    return { down: toPath((p) => p.down), up: toPath((p) => p.up) }
  }, [dataPoints])

  const onRange = (
    key: (typeof RANGES)[number]['key'],
    minutes: number,
    available: boolean,
  ) => {
    if (!available) return
    setRange(key)
    requestRange(minutes)
  }

  return (
    <div className="ark-usage">
      <div className="ark-usage__head">
        <span className="ark-usage__title">下 载 速 度</span>
        <span className="ark-usage__sub en">USAGE</span>
      </div>

      <div className="ark-usage__tabs" role="tablist" aria-label="时间范围">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={range === r.key}
            aria-disabled={!r.available}
            title={r.available ? undefined : '历史数据未持久化，暂无该范围'}
            className={`ark-usage__tab${range === r.key ? ' is-on' : ''}${
              r.available ? '' : ' is-unavailable'
            }`}
            onClick={() => onRange(r.key, r.minutes, r.available)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="ark-usage__cards">
        <div className="ark-usage__card">
          <div className="ark-usage__k">会话</div>
          <div className="ark-usage__v num">{sessions}</div>
        </div>
        <div className="ark-usage__card">
          <div className="ark-usage__k">上传</div>
          <div className="ark-usage__v num">{formatBytes(totals.up)}</div>
        </div>
        <div className="ark-usage__card">
          <div className="ark-usage__k">下载</div>
          <div className="ark-usage__v num">{formatBytes(totals.down)}</div>
        </div>
        <div className="ark-usage__card">
          <div className="ark-usage__k">总计</div>
          <div className="ark-usage__v num">{formatBytes(totals.total)}</div>
        </div>
      </div>

      <div className="ark-usage__dims" role="tablist" aria-label="分类维度">
        {DIMENSIONS.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={dimension === d.key}
            className={`ark-usage__dim${dimension === d.key ? ' is-on' : ''}`}
            onClick={() => setDimension(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="ark-usage__body">
        <div className="ark-usage__list">
          {breakdown.length ? (
            breakdown.map((row) => (
              <div key={row.name} className="ark-usage__row">
                <span className="ark-usage__row-k" title={row.name}>
                  {row.name}
                </span>
                <span className="ark-usage__row-v num">
                  {formatBytes(row.bytes)}
                </span>
                <i
                  className="ark-usage__row-bar"
                  style={{ width: `${peak ? (row.bytes / peak) * 100 : 0}%` }}
                />
              </div>
            ))
          ) : (
            <div className="ark-usage__row">
              <span className="ark-usage__row-k">无活动连接</span>
              <span className="ark-usage__row-v">—</span>
            </div>
          )}
        </div>
        <div className="ark-usage__chart">
          {chart ? (
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="25" x2="300" y2="25" className="ark-usage__grid" />
              <line x1="0" y1="50" x2="300" y2="50" className="ark-usage__grid" />
              <line x1="0" y1="75" x2="300" y2="75" className="ark-usage__grid" />
              <path d={chart.down} className="ark-usage__line ark-usage__line--down" />
              <path d={chart.up} className="ark-usage__line ark-usage__line--up" />
            </svg>
          ) : (
            <div className="ark-usage__empty">等待采样</div>
          )}
          <div className="ark-usage__legend">
            <span>
              <i className="ark-usage__dot ark-usage__dot--down" />
              下载
            </span>
            <span>
              <i className="ark-usage__dot ark-usage__dot--up" />
              上传
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
