/**
 * Browser preview shim — runs the ArClash UI in a plain browser so layouts can
 * be reviewed without building an exe each time.
 *
 * Tauri's `mockIPC` intercepts `__TAURI_INVOKE`, so every backend call the app
 * makes on boot resolves against the fixtures below instead of failing. Without
 * this the app never mounts: the shell calls into `__TAURI_INTERNALS__` during
 * preload, `#root` stays empty, and `#initial-loading-overlay` covers the window
 * forever — which is exactly the "black screen" a browser shows.
 *
 * Scope: read-only preview. Every fixture is fabricated. The traffic and
 * connection streams are pushed through the same `Channel` objects the real
 * backend uses, so the parts of the UI that depend on live data still animate.
 *
 * Loaded only from `preview.html`, a separate Vite entry that is never part of
 * the app bundle.
 */
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'

type PreviewState =
  | 'connected'
  | 'disconnected'
  | 'empty'
  // No subscription with the mode already on global: GLOBAL exists with its
  // built-in DIRECT default, the state behind the user's DIRECT report (11-13).
  | 'empty-global'
  // Direct mode with the tunnel up: the node line stays listed but unmuted-off,
  // and the address must read the machine's exit rather than the node's.
  | 'direct'
  // Running with a subscription but nothing selected anywhere: every node slot
  // must read 「请选择节点」 at a fixed height instead of collapsing.
  | 'unselected'

const readState = (): PreviewState => {
  const raw = new URLSearchParams(window.location.search).get('state')
  if (
    raw === 'disconnected' ||
    raw === 'empty' ||
    raw === 'empty-global' ||
    raw === 'direct' ||
    raw === 'unselected'
  ) {
    return raw
  }
  return 'connected'
}

const state = readState()
const running = state !== 'disconnected'
const hasSubscriptions = state !== 'empty' && state !== 'empty-global'

// ---------------------------------------------------------------------------
// Fixtures. Field names and shapes are copied from services/bindings.ts — a
// shape the real backend would never produce throws inside the app, and the
// preview would then show the wrong thing without saying so.
// ---------------------------------------------------------------------------

const now = Date.now()

const node = (name: string, delay: number, recordId: string) => ({
  recordId,
  name,
  type: 'Shadowsocks',
  history: [{ time: new Date(now - 60_000).toISOString(), delay }],
  id: recordId,
  hidden: false,
  icon: null,
  testUrl: null,
  source: 'profile' as const,
  udp: true,
  xudp: false,
  tfo: false,
  mptcp: false,
  smux: false,
})

const NODES = {
  jp: node('日本·移联01', 505, 'node-jp'),
  hk: node('香港·HKT02', 86, 'node-hk'),
  sg: node('新加坡·SG03', 1240, 'node-sg'),
  us: node('美国·LA04', 100_000, 'node-us'),
}

const member = (n: { name: string; recordId: string }) => ({
  kind: 'node' as const,
  name: n.name,
  recordId: n.recordId,
})

const group = (
  name: string,
  type: string,
  members: { kind: 'node'; name: string; recordId: string }[],
  selected?: string,
) => ({
  name,
  type,
  now: selected ?? null,
  fixed: null,
  hidden: false,
  icon: null,
  testUrl: 'https://www.gstatic.com/generate_204',
  history: [],
  members,
  udp: true,
  xudp: false,
  tfo: false,
  mptcp: false,
  smux: false,
})

const proxyView = {
  schemaVersion: 1,
  orderSource: 'runtime' as const,
  providerState: 'ready' as const,
  // GLOBAL starts on DIRECT, exactly like mihomo's auto-generated group does.
  // That is the state the real app showed (user report, 11-13), and it is what
  // the mode switch has to carry the rule-mode pick into. DIRECT is a real
  // member of GLOBAL in the core, so it is listed here too.
  global: group(
    'GLOBAL',
    'Selector',
    [
      { kind: 'node' as const, name: 'DIRECT', recordId: 'node-direct' },
      ...([NODES.jp, NODES.hk, NODES.sg] as const).map(member),
    ],
    'DIRECT',
  ),
  direct: 'DIRECT',
  groups: [
    group('手动选择', 'Selector', [NODES.jp, NODES.hk, NODES.sg, NODES.us].map(member), '日本·移联01'),
    group('自动选择', 'URLTest', [NODES.hk, NODES.sg, NODES.jp].map(member), '香港·HKT02'),
  ],
  records: {
    'node-direct': node('DIRECT', 0, 'node-direct'),
    'node-jp': NODES.jp,
    'node-hk': NODES.hk,
    'node-sg': NODES.sg,
    'node-us': NODES.us,
  },
  standalone: [],
  providers: [],
}

const emptyProxyView = {
  schemaVersion: 1,
  orderSource: 'fallback' as const,
  providerState: 'unavailable' as const,
  // Even with no subscription the core still generates GLOBAL, seeded with its
  // built-in DIRECT policy — the exact state the user reported (11-13): the
  // home node row read DIRECT as if a node were selected. The fixture mirrors
  // that instead of `global: null`, which hid the report from the preview.
  global: group(
    'GLOBAL',
    'Selector',
    [member({ name: 'DIRECT', recordId: 'node-direct' })],
    'DIRECT',
  ),
  direct: 'DIRECT',
  groups: [],
  records: {
    'node-direct': node('DIRECT', 0, 'node-direct'),
  },
  standalone: [],
  providers: [],
}

const subscription = (
  uid: string,
  name: string,
  used: [number, number],
  total: number,
) => ({
  uid,
  type: 'remote',
  name,
  file: `${uid}.yaml`,
  desc: null,
  url: 'https://example.invalid/sub',
  selected: null,
  extra: { upload: used[0], download: used[1], total },
  updated: Math.floor(now / 1000),
  option: null,
  home: null,
})

// The last two entries are what produced the wrong "2 个配置" count: merge and
// script are global extensions, not subscriptions.
const profiles = {
  current: hasSubscriptions ? 'profile-1' : null,
  items: hasSubscriptions
    ? [
        subscription('profile-1', '鲤云', [36_800_000_000, 12_000_000_000], 100_000_000_000),
        subscription('profile-2', '备用节点', [1_000_000_000, 2_000_000_000], 50_000_000_000),
        {
          uid: 'profile-merge',
          type: 'merge',
          name: '全局扩展配置',
          file: 'merge.yaml',
          desc: null,
          url: null,
          selected: null,
          extra: null,
          updated: null,
          option: null,
          home: null,
        },
        {
          uid: 'profile-script',
          type: 'script',
          name: '全局扩展脚本',
          file: 'script.js',
          desc: null,
          url: null,
          selected: null,
          extra: null,
          updated: null,
          option: null,
          home: null,
        },
      ]
    : [],
}

let vergeConfig = {
  language: 'zh',
  theme_mode: 'dark' as const,
  enable_tun_mode: false,
  enable_system_proxy: false,
  verge_mixed_port: 7887,
  verge_socks_port: 7898,
  verge_port: 7899,
  notice_position: 'bottom-right' as const,
  // Fields the layout/dialog switches read back after a patch; missing ones
  // made every toggle bounce off in the preview (found 11-14 on
  // collapse_navbar — same shape as the clash-config fix above).
  enable_group_icon: true,
  collapse_navbar: false,
  nav_icon: false,
  tray_icon: 'monochrome' as const,
  common_tray_icon: false,
  enable_tray_speed: false,
  tray_inline_outbound_modes: false,
  tray_proxy_groups_display_mode: 'default' as const,
  enable_auto_launch: false,
  enable_silent_start: false,
  enable_external_controller: false,
  start_page: '/',
  auto_check_update: false,
}

// Mutable so the disconnect switch in the preview actually does something.
// Without it `stop_core` returned null and every later read still reported the
// starting mode, so the button looked dead — a preview defect, not an app one.
// The real Rust commands do stop and start the core (src-tauri/src/cmd/clash.rs).
let mockCoreRunning = running

const runtimeState = () => ({
  mode: mockCoreRunning ? ('Sidecar' as const) : ('NotRunning' as const),
  service: 'unknown' as const,
  serviceUnavailableReason: null,
  pendingAction: null,
  sidecarAllowed: true,
  isAdmin: false,
  opInFlight: false,
  serviceUsable: false,
  tunCapable: true,
  serviceNeedsAttention: false,
})

const clashInfo = {
  core_path: 'C:\\mock\\mihomo.exe',
  core_version: 'v1.19.33',
  mihomo_version: 'v1.19.33',
  mixed_port: 7887,
  server: '127.0.0.1',
  port: 9090,
  secret: '',
}

// Mutable so a mode click in the preview actually sticks. Kept next to the
// fixtures rather than inside the IPC table so the reset point is obvious.
// The runtime clash config is mutable: patch_clash_config merges into it so
// controls that read the core config (log level, LAN, IPv6, unified delay)
// keep their selected state after the patch's revalidation. A static object
// here made every switch bounce back in the preview (bb, 11-14).
let clashConfig = {
  mode: 'rule',
  'mixed-port': 7887,
  'log-level': 'info',
  ipv6: false,
  'allow-lan': false,
  'unified-delay': false,
  tun: { enable: false },
}

// `state=direct` and `state=empty-global` boot straight into their mode for the
// address-switch and DIRECT-default checks.
let mockMode =
  state === 'direct'
    ? 'direct'
    : state === 'empty-global'
      ? 'global'
      : 'rule'

// Same view with every selector emptied: the fixed-height placeholder state.
const unselectedProxyView = {
  ...proxyView,
  global: proxyView.global ? { ...proxyView.global, now: null } : null,
  groups: proxyView.groups.map((g) => ({ ...g, now: null })),
}

// Live connections, also feeding the download page's host/process/chain
// breakdown and the connections page.
const connectionItems = [
  ['api.github.com', 'Code.exe', 0, 12_000_000],
  ['www.google.com', 'chrome.exe', 1, 8_400_000],
  ['cdn.jsdelivr.net', 'chrome.exe', 2, 3_100_000],
  ['registry.npmjs.org', 'node.exe', 3, 900_000],
].map(([host, process, i, download], idx) => ({
  id: `conn-${idx}`,
  metadata: {
    network: 'tcp',
    type: 'Shadowsocks',
    host: String(host),
    sourceIP: '127.0.0.1',
    sourcePort: String(50000 + Number(i)),
    destinationPort: '443',
    destinationIP: `203.0.113.${10 + idx}`,
    process: String(process),
    processPath: `C:\\mock\\${process}`,
  },
  upload: 200_000 * (idx + 1),
  download: Number(download),
  start: new Date(now - 60_000).toISOString(),
  chains: ['手动选择', '日本·移联01'],
  rule: 'DomainSuffix',
  rulePayload: String(host).split('.').slice(-2).join('.'),
}))

// ---------------------------------------------------------------------------
// IPC table
// ---------------------------------------------------------------------------

const HANDLERS: Record<string, () => unknown> = {
  get_verge_config: () => vergeConfig,
  get_profiles: () => profiles,
  get_proxy_view: () =>
    running && hasSubscriptions
      ? state === 'unselected'
        ? unselectedProxyView
        : proxyView
      : emptyProxyView,
  get_runtime_state: () => runtimeState(),
  get_clash_info: () => ({ ...clashInfo, clash_mode: mockMode }),
  get_clash_mode: () => (running ? mockMode : null),
  get_runtime_config: () => ({ ...clashConfig }),
  get_clash_config: () => ({ ...clashConfig }),
  get_system_proxy: () => ({ enable: false, server: '', bypass: '' }),
  get_auto_proxy: () => ({ enable: false, url: '' }),
  get_sys_proxy: () => ({ enable: false, server: '', bypass: '' }),
  get_rules: () => [],
  get_rule_providers: () => ({}),
  get_clash_logs: () => [],
  get_runtime_logs: () => ({}),
  get_runtime_yaml: () => '',
  get_app_uptime: () => 13 * 60 * 1000,
  get_embedded_server_port: () => 11233,
  get_system_info: () => ({ system_name: 'Windows', system_version: '11 Pro' }),
  get_system_hostname: () => 'DESKTOP-MOCK',
  get_network_interfaces: () => ({}),
  get_network_interfaces_info: () => [],
  get_pending_failures: () => [],
  get_sidecar_failure: () => ({ revision: 0, detail: null }),
  get_unlock_items: () => [],
  get_next_update_time: () => null,
  get_app_dir: () => 'C:\\mock\\app',
  get_dns_config_content: () => '',
}

// Commands that need their arguments, kept separate from the zero-argument
// table above so the simple fixtures stay declarative.
const ARG_HANDLERS: Record<string, (args: unknown) => unknown> = {
  // The subscription YAML, parsed by the app for node server addresses
  // (`useNodeServers`). Names must match the fixture nodes above; the servers
  // are fabricated addresses so the node line visibly differs from the probed
  // exit IP.
  read_profile_file: () => `# mock profile for preview state checks
proxies:
  - { name: "日本·移联01", server: "104.21.52.17", port: 443, type: ss, cipher: aes-128-gcm, password: mock }
  - { name: "香港·HKT02", server: "23.44.51.8", port: 443, type: ss, cipher: aes-128-gcm, password: mock }
  - { name: "新加坡·SG03", server: "172.67.30.190", port: 443, type: ss, cipher: aes-128-gcm, password: mock }
  - { name: "美国·LA04", server: "us-la04.example.invalid", port: 443, type: ss, cipher: aes-128-gcm, password: mock }
`,
  // The app's own mode command (services/bindings.ts). Writing `mockMode` here
  // is what makes a mode click visible: the card refetches after patching, so
  // the next `get_base_config` / `get_clash_mode` read must reflect the change.
  patch_clash_mode: (args) => {
    const next = (args as { payload?: string } | undefined)?.payload
    if (next) mockMode = next
    return null
  },
  // The tunnel switch (A semantics): writes enable_system_proxy /
  // enable_tun_mode into the fixture so `get_verge_config` reflects it and the
  // UI state flips. Without this the preview could not show the switch working.
  patch_clash_config: (args) => {
    const patch = (args as { payload?: Record<string, unknown> } | undefined)
      ?.payload
    if (patch) {
      clashConfig = { ...clashConfig, ...patch } as typeof clashConfig
    }
    return null
  },
  patch_verge_config: (args) => {
    const patch = (args as { payload?: Record<string, unknown> } | undefined)
      ?.payload
    if (patch) {
      vergeConfig = { ...vergeConfig, ...patch } as typeof vergeConfig
    }
    return null
  },
}

// Live-data channels. The mihomo plugin opens its streams with
// `invoke('plugin:mihomo|ws_*', { onMessage: Channel })`; capturing that Channel
// lets the fixtures drive the same callbacks the Rust side would.
type ChannelLike = { id: number }
const channels: { id: number; kind: string; index: number }[] = []

const pushToChannel = (id: number, payload: unknown) => {
  const internals = (
    window as typeof window & {
      __TAURI_INTERNALS__?: {
        runCallback?: (id: number, data: unknown) => void
      }
    }
  ).__TAURI_INTERNALS__
  // Channel messages are ordered by `index`; the receiver delivers them in
  // sequence, so a monotonic counter per channel is required.
  const entry = channels.find((c) => c.id === id)
  const index = entry ? entry.index++ : 0
  internals?.runCallback?.(id, { index, message: payload })
}

// ---------------------------------------------------------------------------
// HTTP. `getIpInfo` fetches its IP through `@tauri-apps/plugin-http`, which is
// Rust-side and therefore has no implementation in a browser. The plugin's
// protocol is three calls: `fetch` (begin, returns a handle), `fetch_send`
// (status and headers) and `fetch_read_body` (one chunk, last byte flags the
// end — 1 closes, 0 continues). The address shown here is from the RFC 5737
// documentation range, so it can never be mistaken for a real user's IP.
// ---------------------------------------------------------------------------

// The two addresses are deliberately different so the preview shows what direct
// mode actually does: the probe follows the system proxy stack, so with a node
// selected it reports the node's exit and in direct mode it reports the machine.
// Both are from the RFC 5737 documentation range.
//
// `getIpInfo` shuffles six providers per call and each `mapping` reads a
// different shape (`country` / `country_name` / `location.country` /
// `connection.org`, ...). Answering every URL with one body made the row flip
// between "Japan Japan", a bare address, and the right thing depending on the
// draw — so each provider gets the body it actually produces, copied from
// `services/api.ts:42-139`. That keeps the preview honest about the real
// randomness instead of hiding it behind invented data.
type Geo = {
  ip: string
  code: string
  name: string
  region: string
  city: string
  org: string
  asn: number
  lat: number
  lon: number
  tz: string
}

// The tunnel's exit (what the selected node answers with) and the machine's own
// exit. Which one the app gets depends on whether the request went through the
// core's proxy port — that is the distinction the real probe makes, so the mock
// has to reproduce it rather than just look at the mode.
const NODE_EXIT_GEO: Geo = {
  ip: '203.0.113.42',
  code: 'JP',
  name: 'Japan',
  region: 'Tokyo',
  city: 'Tokyo',
  org: 'Mock Telecom',
  asn: 64500,
  lat: 35.68,
  lon: 139.69,
  tz: 'Asia/Tokyo',
}

const LOCAL_GEO: Geo = {
  ip: '198.51.100.7',
  code: 'CN',
  name: 'China',
  region: 'Beijing',
  city: 'Beijing',
  org: 'Mock Broadband',
  asn: 64501,
  lat: 39.9,
  lon: 116.4,
  tz: 'Asia/Shanghai',
}

// Set per request in the http handler below: true when the caller passed a
// proxy, which is exactly when the real app is asking for the node's exit.
let probeThroughProxy = false

const geoFor = (): Geo => (probeThroughProxy ? NODE_EXIT_GEO : LOCAL_GEO)

// One body per provider, in that provider's real field names.
const providerBodies: Record<string, (g: Geo) => unknown> = {
  'api.ip.sb': (g) => ({
    ip: g.ip,
    country_code: g.code,
    country: g.name,
    region: g.region,
    city: g.city,
    organization: g.org,
    asn: g.asn,
    asn_organization: g.org,
    latitude: g.lat,
    longitude: g.lon,
    timezone: g.tz,
  }),
  'ipapi.co': (g) => ({
    ip: g.ip,
    country_code: g.code,
    country_name: g.name,
    region: g.region,
    city: g.city,
    org: g.org,
    asn: `AS${g.asn}`,
    latitude: g.lat,
    longitude: g.lon,
    timezone: g.tz,
  }),
  'api.ipapi.is': (g) => ({
    ip: g.ip,
    location: {
      country_code: g.code,
      country: g.name,
      state: g.region,
      city: g.city,
      latitude: g.lat,
      longitude: g.lon,
      timezone: g.tz,
    },
    asn: { asn: g.asn, org: g.org },
    company: { name: g.org },
  }),
  'ipwho.is': (g) => ({
    ip: g.ip,
    country_code: g.code,
    country: g.name,
    region: g.region,
    city: g.city,
    connection: { asn: g.asn, org: g.org, isp: g.org },
    latitude: g.lat,
    longitude: g.lon,
    timezone: { id: g.tz },
  }),
  // This endpoint really does answer with the ISO code only
  // (verified against the live service), which is why its mapping copies
  // `country` into both fields.
  'ip.api.skk.moe': (g) => ({
    ip: g.ip,
    country: g.code,
    region: g.region,
    city: g.city,
    asOrg: g.org,
    asn: g.asn,
    latitude: g.lat,
    longitude: g.lon,
    timezone: g.tz,
  }),
  'get.geojs.io': (g) => ({
    ip: g.ip,
    country_code: g.code,
    country: g.name,
    region: g.region,
    city: g.city,
    organization_name: g.org,
    asn: g.asn,
    latitude: String(g.lat),
    longitude: String(g.lon),
    timezone: g.tz,
  }),
}

// Falls back to the ip.sb shape when the requested host is not one of the six,
// so an unexpected URL still yields a usable body instead of `{}`.
const currentIpFixture = (url: string) => {
  const g = geoFor()
  const host = Object.keys(providerBodies).find((key) => url.includes(key))
  const shape = host ? providerBodies[host] : providerBodies['api.ip.sb']
  return JSON.stringify(shape(g))
}

// Handle id -> the chunks still to hand out, and how many have been served.
const httpBodies = new Map<number, { chunks: Uint8Array[]; served: number }>()
let httpHandle = 1

const encodeBody = (text: string) => new TextEncoder().encode(text)

mockIPC(
  (cmd, args) => {
    // Core start/stop. Handled here rather than in the fixture table because
    // these must also emit `verge://run-state-changed`, which is how the real
    // backend tells the UI the mode changed. The store only re-reads on a poll
    // (30s) or window focus, so without the event the switch looked dead until
    // the next poll — the app itself is fine.
    if (cmd === 'start_core' || cmd === 'stop_core' || cmd === 'restart_core') {
      const next = cmd !== 'stop_core'
      mockCoreRunning = next
      // Queued so the caller's invoke settles first; the real backend emits
      // after the command completes too.
      window.setTimeout(() => {
        void (
          window as typeof window & {
            __TAURI_INTERNALS__?: {
              invoke?: (c: string, a: unknown) => Promise<unknown>
            }
          }
        ).__TAURI_INTERNALS__?.invoke?.('plugin:event|emit', {
          event: 'verge://run-state-changed',
          payload: runtimeState(),
        })
      }, 0)
      return null
    }
    if (cmd === 'plugin:http|fetch') {
      const rid = httpHandle++
      const config = (args as { clientConfig?: { url?: string; proxy?: unknown } })
        ?.clientConfig
      const url = config?.url ?? ''
      // The app asks a different question when it routes the probe through the
      // core's proxy port: the answer is then the node's exit, not the
      // machine's. Mirror that so the preview can show both.
      probeThroughProxy = Boolean(config?.proxy)
      // One chunk of the JSON, then the terminator on the next read.
      httpBodies.set(rid, {
        chunks: [encodeBody(currentIpFixture(url))],
        served: 0,
      })
      return rid
    }
    if (cmd === 'plugin:http|fetch_send') {
      return {
        status: 200,
        statusText: 'OK',
        url: 'https://api.mock.invalid/geoip',
        headers: [['content-type', 'application/json']],
        rid: Number((args as { rid?: number } | undefined)?.rid ?? 0),
      }
    }
    if (cmd === 'plugin:http|fetch_read_body') {
      const rid = Number((args as { rid?: number } | undefined)?.rid ?? 0)
      const entry = httpBodies.get(rid)
      if (!entry) return new Uint8Array([1])
      if (entry.served < entry.chunks.length) {
        const chunk = entry.chunks[entry.served++]
        // Trailing 0 = more data follows; the reader strips this byte.
        return new Uint8Array([...chunk, 0])
      }
      httpBodies.delete(rid)
      // Trailing 1 = stream finished.
      return new Uint8Array([1])
    }
    if (cmd === 'plugin:http|fetch_cancel' || cmd === 'plugin:http|fetch_cancel_body') {
      return null
    }
    if (cmd.startsWith('plugin:mihomo|ws_')) {
      const channel = (args as { onMessage?: ChannelLike } | undefined)?.onMessage
      if (channel?.id != null) {
        channels.push({ id: channel.id, kind: cmd, index: 0 })
      }
      return `mock-ws-${channels.length}`
    }
    // The mihomo plugin routes its reads through `plugin:mihomo|<name>`, which
    // the generic `plugin:` fallback would otherwise answer with null. The mode
    // card reads `get_base_config` for the selected mode.
    //
    // The mode lives in `mockMode` so a click actually changes the UI: without
    // that, `patch_base_config` resolved successfully but every later read
    // returned the starting value and the buttons looked dead.
    if (cmd === 'plugin:mihomo|get_base_config') {
      return {
        mode: mockMode,
        'mixed-port': 7887,
        'allow-lan': false,
        'log-level': 'info',
        ipv6: false,
        tun: { enable: false, stack: 'system' },
      }
    }
    if (cmd === 'plugin:mihomo|patch_base_config') {
      const next = (args as { config?: { mode?: string } } | undefined)?.config
      if (next?.mode) mockMode = next.mode
      return null
    }
    if (cmd === 'plugin:mihomo|get_clash_mode') {
      return running ? mockMode : null
    }
    // Selecting a node. The app writes the rule-mode pick into GLOBAL when the
    // mode becomes global (option B), and the preview has to reflect that or
    // the mode switch would look broken here while working in the real app.
    if (cmd === 'plugin:mihomo|select_node_for_group') {
      const payload = args as
        | { groupName?: string; node?: string }
        | undefined
      const groupName = payload?.groupName
      const nodeName = payload?.node
      if (groupName && nodeName) {
        for (const g of proxyView.groups) {
          if (g.name === groupName) g.now = nodeName
        }
        if (proxyView.global?.name === groupName) {
          proxyView.global.now = nodeName
        }
      }
      return null
    }
    if (cmd.startsWith('plugin:mihomo|')) {
      return null
    }
    if (cmd === 'plugin:event|listen' || cmd === 'plugin:event|unlisten') {
      return 0
    }
    if (cmd.startsWith('plugin:')) return null
    const argHandler = ARG_HANDLERS[cmd]
    if (argHandler) return argHandler(args)
    const handler = HANDLERS[cmd]
    return handler ? handler() : null
  },
  { shouldMockEvents: true },
)

mockWindows('main')

// Traffic ticks and the connection snapshot, routed into the captured channels.
if (running) {
  let up = 1_100_000
  let down = 8_200_000

  const tick = () => {
    // Wobble around the base rates so the bars and the chart visibly animate.
    up = Math.round(1_100_000 * (0.6 + Math.random() * 0.8))
    down = Math.round(8_200_000 * (0.6 + Math.random() * 0.8))
    for (const ch of channels) {
      if (ch.kind.endsWith('ws_traffic')) {
        pushToChannel(ch.id, {
          up,
          down,
          upTotal: 134_100_000,
          downTotal: 1_310_000_000,
        })
      }
      if (ch.kind.endsWith('ws_memory')) {
        pushToChannel(ch.id, { inuse: 26_700_000, oslimit: 0 })
      }
      if (ch.kind.endsWith('ws_connections')) {
        pushToChannel(ch.id, {
          downloadTotal: 480_000_000,
          uploadTotal: 20_000_000,
          connections: connectionItems,
        })
      }
      if (ch.kind.endsWith('ws_connections_count')) {
        pushToChannel(ch.id, { count: connectionItems.length })
      }
    }
  }

  window.setInterval(tick, 1000)
  window.setTimeout(tick, 300)
}

// The shell hides this only after a successful mount, so removing it here would
// lie about a failed boot. It is removed by the app; leaving the fallback is the
// honest result when mounting throws.
