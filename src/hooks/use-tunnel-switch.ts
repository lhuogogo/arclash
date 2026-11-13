import { closeAllConnections } from 'tauri-plugin-mihomo-api'

import { patchVergeConfig } from '@/services/cmds'
import { useVerge } from '@/hooks/use-verge'
import { mutate } from '@/services/mutate'

/**
 * The connect / disconnect switch, shared by the left rail button and the
 * home block's CTA.
 *
 * "Connected" means the system proxy is on or TUN is on — the tunnel is what
 * users care about, not whether the core process happens to run. Disconnecting
 * turns both off and clears the connection list while the core keeps running
 * (start_core / stop_core stay available for service flows, but the switch no
 * longer touches them).
 *
 * "Connecting" restores the channel the user had when they last disconnected:
 * system-proxy-only comes back without TUN, a TUN session comes back with TUN.
 * That preference lives in `tunnel_mode` ("proxy" | "tun" | "both"), written on
 * disconnect and persisted in verge.yaml, so it survives restarts. Startup
 * itself never applies it — the app boots disconnected and waits.
 */
export const useTunnelSwitch = () => {
  const { verge, mutateVerge } = useVerge()

  const tunnelUp = Boolean(
    verge?.enable_system_proxy || verge?.enable_tun_mode,
  )

  const disconnect = async () => {
    const systemProxy = Boolean(verge?.enable_system_proxy)
    const tun = Boolean(verge?.enable_tun_mode)
    // Record the combination before switching off: this field is the persisted
    // memory that `connect` reads back, and it must not be one of the false
    // flags the disconnect is about to write.
    const mode = systemProxy && tun ? 'both' : tun ? 'tun' : 'proxy'
    const patch: Partial<IVergeConfig> = {
      enable_system_proxy: false,
      tunnel_mode: mode,
    }
    if (tun) patch.enable_tun_mode = false
    await mutate(() => patchVergeConfig(patch), {
      id: 'tunnel-switch',
      revalidate: [['getVergeConfig']],
      errorNotice: false,
    })
    if (verge?.auto_close_connection) {
      await mutate(() => closeAllConnections(), {
        id: 'close-all-connections',
        errorNotice: false,
      }).catch(() => {})
    }
  }

  const connect = async () => {
    const patch: Partial<IVergeConfig> = {}
    const mode = verge?.tunnel_mode
    if (mode === 'tun') {
      patch.enable_tun_mode = true
    } else if (mode === 'both') {
      patch.enable_system_proxy = true
      patch.enable_tun_mode = true
    } else {
      // "proxy" and the never-connected case: system proxy is the least
      // surprising default for a Clash client.
      patch.enable_system_proxy = true
    }
    await mutate(() => patchVergeConfig(patch), {
      id: 'tunnel-switch',
      revalidate: [['getVergeConfig']],
      errorNotice: false,
    })
  }

  return { tunnelUp, connect, disconnect }
}
