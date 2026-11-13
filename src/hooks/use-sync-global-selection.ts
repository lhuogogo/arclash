import { useCallback } from 'react'
import { selectNodeForGroup } from 'tauri-plugin-mihomo-api'

import { useProxiesData } from '@/providers/app-data-context'
import { debugLog } from '@/utils/debug'

/**
 * Keep the core's GLOBAL group pointed at the node the user picked.
 *
 * mihomo generates its GLOBAL group on its own and its `now` starts as DIRECT,
 * with no link to whatever the rule-mode selectors are set to. Switching to
 * global therefore sent traffic straight out — the node row showed `DIRECT` and
 * the exit address stayed local, which read as "my selection was lost" (user
 * report, 11-13).
 *
 * The chosen behaviour (user decision, option B) is to carry the selection over:
 * when the mode becomes global, write the rule-mode selection into GLOBAL once.
 * Switching back to rule mode leaves the original selectors untouched, so the
 * user's pick is never lost in either direction.
 *
 * Deliberately quiet on failure: the core may not be ready yet, and a failed
 * carry-over must not turn a mode click into an error dialog. GLOBAL's real
 * selection is still shown, so the UI stays truthful either way.
 */
export const useSyncGlobalSelection = () => {
  const { proxyView } = useProxiesData()

  return useCallback(
    async (mode: string) => {
      if (mode !== 'global') return
      const global = proxyView?.global
      if (!global) return

      // The rule-mode selection: the user's explicit pick if there is one,
      // otherwise the first selectable group's current member. Both are the
      // same source the home block reads, so the two can never disagree.
      const saved =
        typeof window === 'undefined'
          ? null
          : localStorage.getItem('clash-verge-selected-proxy-group')
      const group =
        (saved ? proxyView?.groups.find((g) => g.name === saved) : undefined) ??
        proxyView?.groups.find(
          (g) => !g.hidden && (g.type === 'Selector' || g.type === 'URLTest'),
        )
      const target = group?.now
      if (!target) return

      // Already in place: no write, no churn on every mode click.
      if (global.now === target) return
      // GLOBAL lists every node and group; selecting something it does not
      // contain would only produce a core error.
      const known = global.members.some((m) => m.name === target)
      if (!known) return

      try {
        await selectNodeForGroup('GLOBAL', target)
        debugLog(`[GlobalSync] GLOBAL -> ${target}`)
      } catch (error) {
        debugLog('[GlobalSync] carrying the selection into GLOBAL failed', error)
      }
    },
    [proxyView],
  )
}
