import { useEffect, useRef } from 'react'

import { getIpInfo } from '@/services/api'
import { revalidateQuery, useQuery } from '@/services/query-client'

/**
 * Egress IP shown beside the node line.
 *
 * Two different questions share this row, and they must not be answered by the
 * same probe:
 *
 * - Tunnel up: what address does traffic leave from through the *selected node*?
 *   That has to be probed **through the core's proxy port**, because the node's
 *   own `server` in the subscription is often a CDN hostname (a real report:
 *   `chuixuevl6.blowingsnowclouds.cc` resolved to a CN address for a Singapore
 *   node, so the country line was wrong). The node's exit address is the honest
 *   answer and it changes with the node.
 * - Disconnected or direct: the machine's own exit, probed without a proxy.
 *
 * The probe runs on core transitions and whenever the selected node changes
 * while connected — switching nodes changes the answer, so keeping the old one
 * would be a stale fact rather than a stable one. Mode switches between rule and
 * global do not re-probe: both route through the same selected node.
 *
 * Shares the `cv_ip_info_cache` key with the (currently unused) `IpInfoCard` so
 * the two can never hold different answers.
 */
export const IP_INFO_CACHE_KEY = 'cv_ip_info_cache'

export const useEgressIpInfo = (
  coreRunning: boolean,
  options?: {
    /** Mixed port of the running core; the probe goes through it when set. */
    proxyPort?: number
    /** Selected node name. Changing it while connected re-probes. */
    nodeKey?: string
    /** Whether traffic actually goes through a node (tunnel up, not direct). */
    viaNode?: boolean
  },
) => {
  const proxyPort = options?.proxyPort
  const viaNode = Boolean(options?.viaNode) && coreRunning
  const nodeKey = options?.nodeKey

  const result = useQuery({
    queryKey: [IP_INFO_CACHE_KEY, viaNode ? `node:${nodeKey ?? ''}` : 'local'],
    queryFn: () =>
      getIpInfo(viaNode && proxyPort ? { proxyPort } : undefined),
    enabled: true,
    // The value only changes on a core transition or a node change, both
    // handled below.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 30_000,
  })

  // Probe once on mount, then again whenever the route changes: core
  // transitions, and node switches while connected.
  const previousKey = useRef<string | null>(null)
  const routeKey = `${viaNode ? 'node' : 'local'}:${nodeKey ?? ''}`
  useEffect(() => {
    const changed =
      previousKey.current === null || previousKey.current !== routeKey
    previousKey.current = routeKey
    if (!changed) return
    void revalidateQuery([IP_INFO_CACHE_KEY, viaNode ? `node:${nodeKey ?? ''}` : 'local'])
  }, [routeKey, viaNode, nodeKey])

  return result
}
