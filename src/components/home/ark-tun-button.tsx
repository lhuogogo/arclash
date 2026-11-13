import { useLockFn } from 'ahooks'
import { useTranslation } from 'react-i18next'

import { useSystemState } from '@/hooks/use-system-state'
import { useVerge } from '@/hooks/use-verge'
import { showNotice } from '@/services/notice-service'
import { requestService } from '@/services/service-request'

/**
 * Single-row TUN switch for the status page, matching prototype/v9 `.tun-btn`.
 *
 * Deliberately NOT ProxyTunCard: that component is a two-tab composite
 * (system proxy / TUN) plus a description line, needing roughly 80px of
 * height. v9 wants one 30px row, so the composite cannot be squeezed into it.
 * The system-proxy entry is not lost — it already exists in the settings page
 * (`components/setting/mods/sysproxy-viewer.tsx`).
 *
 * Toggle behaviour mirrors `components/shared/proxy-control-switches.tsx`
 * `handleTunToggle`: optimistic write through mutateVerge, then patchVerge,
 * and when the service is unavailable ask for elevation instead of silently
 * failing. Red is the v9 choice for TUN because gold belongs to the latency
 * scale; mixing them breaks the token semantics.
 */
export const ArkTunButton = () => {
  const { t } = useTranslation()
  const { verge, mutateVerge, patchVerge } = useVerge()
  const { isTunModeAvailable } = useSystemState()
  const enabled = Boolean(verge?.enable_tun_mode)

  const toggle = useLockFn(async () => {
    const next = !enabled

    if (next && !isTunModeAvailable) {
      requestService({
        reason: 'tunNeedsService',
        restore: { enable_tun_mode: next },
      })
      return
    }

    mutateVerge({ ...verge, enable_tun_mode: next }, false)
    try {
      await patchVerge({ enable_tun_mode: next })
    } catch (err) {
      mutateVerge({ ...verge, enable_tun_mode: enabled }, false)
      showNotice.error(err)
    }
  })

  return (
    <button
      type="button"
      className={`tun-btn${enabled ? ' is-on' : ''}`}
      aria-pressed={enabled}
      onClick={() => void toggle()}
    >
      <span className="tun-ico" aria-hidden="true">
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M2 8h12" />
          <path d="M4 5v6M8 3.5v9M12 5v6" />
        </svg>
      </span>
      <span className="tun-txt">{enabled ? '关闭 TUN' : '开启 TUN'}</span>
      <span className="tun-state">{enabled ? 'ON' : 'OFF'}</span>
    </button>
  )
}

export default ArkTunButton
