import { readProfileFile } from '@/services/cmds'
import { useQuery } from '@/services/query-client'
import { parseYamlSafe } from '@/utils/yaml'

/**
 * Server addresses of the current profile's nodes, keyed by node name.
 *
 * The mihomo runtime API never exposes where a node actually connects, so the
 * address shown while a node carries traffic is read from the subscription
 * YAML instead. Provider-fed nodes and unreadable profiles are simply absent
 * from the map; callers fall back to the probed exit IP then, which is still
 * the honest answer of what traffic goes out through.
 *
 * Keyed on the profile uid: switching subscriptions refetches, and an edited
 * subscription keeps its address until the app is reopened — a stale address
 * is better than refetching the whole profile on every mode click.
 */
export const useNodeServers = (profileUid: string | null | undefined) => {
  const { data } = useQuery({
    queryKey: ['nodeServers', profileUid],
    queryFn: async () => {
      if (!profileUid) return {}
      const yaml = await readProfileFile(profileUid)
      const parsed = parseYamlSafe(yaml) as
        | { proxies?: { name?: unknown; server?: unknown }[] }
        | null
        | undefined
      const servers: Record<string, string> = {}
      for (const proxy of parsed?.proxies ?? []) {
        if (typeof proxy?.name === 'string' && typeof proxy?.server === 'string') {
          servers[proxy.name] = proxy.server
        }
      }
      return servers
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })
  return data
}
