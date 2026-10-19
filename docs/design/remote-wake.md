# Waking a sleeping computer from the app (#63)

Status: investigated 2026-10-19. **No option is reliable enough to ship as a "Wake" button today.** Keeping the computer awake (#62, `keepAwake`) covers the common case; waking one that already sleeps is documented as a limitation, with a manual path for users who have the hardware.

## The problem

While the computer sleeps, nothing of Remote Harness runs: the daemon, tmux and Tailscale on that machine are suspended. The phone reaches the computer only through Tailscale (WireGuard over UDP), usually from another network (cellular). Anything that wakes the machine must therefore come from **another device that is awake** and can talk to the sleeping computer's network card.

## Options evaluated

| Option | How it would work | Over cellular | Verdict |
| --- | --- | --- | --- |
| Wake-on-LAN from the phone | The app sends the magic packet (UDP broadcast with the MAC address) | No: broadcast does not cross Tailscale or the internet | Only works on the same Wi-Fi; on iOS, sending broadcast needs the `com.apple.developer.networking.multicast` entitlement, granted by Apple on request. Not worth a native module for the at-home case. |
| Wake-on-LAN through a LAN relay | An always-on device on the computer's LAN and in the tailnet (Raspberry Pi, NAS, router, another computer) receives a request from the app over Tailscale and sends the magic packet | Yes | **The only general solution.** Needs extra hardware, pairing a second device with the app, storing the target's MAC address, and a target whose network card wakes on LAN (Ethernet desktops mostly; Mac laptops and most Wi-Fi cards do not). |
| Tailscale's own WoL | Tailscale nodes can upload their MAC (`TS_WAKE_MAC`) and the coordination server can ask a peer on the same LAN to send the packet | Yes | Driven by Tailscale's control plane, not documented as a public API we can call; cannot be built on. |
| macOS "Wake for network access" (Bonjour Sleep Proxy) | An Apple TV / HomePod / AirPort keeps the Mac's Bonjour services registered and wakes it when one is contacted on the LAN | No | Only Bonjour services on the local network trigger it, not Tailscale traffic (the WireGuard tunnel ends on the sleeping Mac). Laptops also need power and a display. The wake is a "dark wake" that sleeps again after ~30 s unless something holds it. |
| Scheduled wake (`pmset schedule` / `rtcwake`) | The daemon schedules periodic wake-ups to check in, then sleeps again | n/a | Needs root, changes power settings (the daemon must not do this silently), and the phone still cannot trigger a wake: it only sees short windows of availability. |

## Recommendation

1. **Prevent instead of wake**: #62 keeps the computer awake while sessions run and for 10 minutes after; the app says when the computer is not answering (probably asleep). This is the supported path.
2. **Document** the limitation (README, troubleshooting) and the manual setup for users with a LAN device: enable Wake-on-LAN on the computer, note its MAC address, and send the magic packet from a device on the same LAN reached over Tailscale (for example `ssh pi@raspberrypi wakeonlan AA:BB:CC:DD:EE:FF`, a router with WoL, or a WoL web UI on the tailnet).
3. **Revisit a relay** when there is demand: a `remote-harness relay` mode for a Linux device on the LAN, paired like a computer, that only accepts `wake` requests from the paired app (token) and knows the MAC addresses the computer reported with the user's consent; the app would show "Computer asleep · Wake" when the computer is unreachable and a relay is paired. Effort is mostly in the app (a second paired device) and in testing on real hardware.

## Sources

- Tailscale WoL knob and c2n handler: `hostinfo/wol.go` in the Tailscale source ([mirror](https://git.quad4.io/Mirrors/tailscale/src/commit/fc8b6d9c6a6c510227b21abf00bdfd24e53ab176/hostinfo/wol.go)).
- Magic packets do not cross Tailscale; LAN relays as the workaround: [TrueNAS forum](https://forums.truenas.com/t/tailscale-and-wol/63887), [tailscale-wakeonlan](https://github.com/cl0vrfi3ld/tailscale-wakeonlan-helm).
- Bonjour Sleep Proxy: [Apple, About Wake on Demand](https://nrs.preservation.mirrorweb.com/public/20170610164455mp_/https://support.apple.com/el-gr/HT201960), [Stuart Cheshire, Understanding Sleep Proxy Service](https://stuartcheshire.org/sleepproxy/), [Apple Developer Forums, dark wake](https://developer.apple.com/forums/thread/771999).
