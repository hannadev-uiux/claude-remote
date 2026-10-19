/**
 * Landing stylesheet: dark first (the product's own terminal look), light when the visitor
 * prefers it. Tokens mirror `docs/design/identity/shared.css`; the phone mock keeps the app's
 * dark theme in both.
 */
export const STYLES = `
:root {
  color-scheme: dark;
  --bg: #0d0d0d; --surface: #161616; --raised: #1e1d1c; --border: #2a2a2a; --border-strong: #3a3836;
  --fg: #e8e6e3; --muted: #8a8784; --dim: #5e5a56;
  --accent: #e8a33d; --accent-fg: #e8a33d; --accent-ink: #1a1206; --accent-soft: rgba(232, 163, 61, 0.14);
  --success: #7fb069; --warning: #f3dc7a; --danger: #e06c75;
  --claude: #d97757; --codex: #2fbf8f; --kimi: #5b9bf5; --qwen: #8c6cf5;
  --glow: radial-gradient(60% 50% at 70% 30%, rgba(232, 163, 61, 0.14), transparent 70%);
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
    --bg: #f3f3f1; --surface: #ffffff; --raised: #f8f8f6; --border: #e1e0dc; --border-strong: #cbc9c4;
    --fg: #1b1a19; --muted: #66635f; --dim: #9b9893;
    --accent: #e8a33d; --accent-fg: #a0640a; --accent-ink: #1a1206; --accent-soft: rgba(232, 163, 61, 0.18);
    --success: #3f8a3a; --warning: #b88a0e; --danger: #c0392b;
    --glow: radial-gradient(60% 50% at 70% 30%, rgba(232, 163, 61, 0.22), transparent 70%);
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: var(--sans); font-size: 16px; line-height: 1.6; background: var(--bg); color: var(--fg); }
a { color: var(--accent-fg); text-decoration: none; }
a:hover { text-decoration: underline; }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
h1, h2, h3 { margin: 0; line-height: 1.2; text-wrap: balance; font-weight: 700; font-family: var(--mono); }
h1 { font-size: clamp(32px, 5vw, 50px); letter-spacing: -0.03em; line-height: 1.08; }
h2 { font-size: clamp(24px, 3vw, 32px); letter-spacing: -0.02em; }
h3 { font-size: 15px; }
p { margin: 0; max-width: 62ch; }
code, kbd { font-family: var(--mono); font-size: 0.92em; background: var(--raised); padding: 1px 5px; border-radius: 4px; }
.mono, .btn, .pill, .eyebrow, nav, .agent, .reqs span, footer small, .tabs button, .lang a, .meta { font-family: var(--mono); }
.skip { position: absolute; left: -999px; top: 8px; z-index: 40; background: var(--accent); color: var(--accent-ink); padding: 8px 12px; border-radius: 8px; font-family: var(--mono); font-size: 13px; }
.skip:focus { left: 16px; }
.gutter { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.in { max-width: 1120px; margin: 0 auto; }
header.top { position: sticky; top: 0; z-index: 30; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
header.top .in { display: flex; align-items: center; gap: 18px; height: 60px; }
header.top .brand { display: flex; align-items: center; gap: 9px; font-weight: 700; color: var(--fg); font-family: var(--mono); font-size: 15px; }
header.top .brand svg { width: 24px; height: 24px; color: var(--accent); }
header.top nav { display: flex; gap: 4px; margin-left: auto; }
header.top nav a { color: var(--muted); font-size: 12.5px; padding: 6px 10px; border-radius: 6px; }
header.top nav a:hover { color: var(--fg); background: var(--surface); text-decoration: none; }
.lang { display: flex; gap: 2px; border: 1px solid var(--border); border-radius: 8px; padding: 2px; font-size: 11px; margin-left: auto; }
header.top nav + .lang { margin-left: 0; }
.lang a { padding: 3px 7px; border-radius: 6px; color: var(--muted); }
.lang a:hover { text-decoration: none; color: var(--fg); }
.lang a[aria-current="page"] { background: var(--raised); color: var(--fg); font-weight: 600; }
header.top .gh { font-family: var(--mono); font-size: 12px; color: var(--fg); border: 1px solid var(--border-strong); border-radius: 8px; padding: 6px 10px; white-space: nowrap; }
@media (max-width: 760px) { header.top nav { display: none; } }
.hero { position: relative; padding-block: 64px 40px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 40px; align-items: center; }
.hero::before { content: ""; position: absolute; inset: 0; background: var(--glow); pointer-events: none; }
.hero > * { position: relative; }
.hero .copy { display: flex; flex-direction: column; gap: 22px; }
.hero .copy p.lead { font-size: 18px; color: var(--muted); max-width: 54ch; }
.eyebrow { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent-fg); font-weight: 600; }
.ctas { display: flex; gap: 12px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--fg); }
.btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.btn:hover { text-decoration: none; filter: brightness(1.06); }
.meta { font-size: 12px; color: var(--muted); display: flex; gap: 10px; flex-wrap: wrap; }
.hero .shot { display: flex; justify-content: center; }
.hero .shot .phone { zoom: 0.62; }
@media (max-width: 860px) { .hero { grid-template-columns: 1fr; padding-block: 44px 32px; } .hero .shot .phone { zoom: 0.5; } }
.agents { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; padding-block: 18px 40px; border-bottom: 1px solid var(--border); }
.agents .lbl { font-family: var(--mono); font-size: 12px; color: var(--muted); margin-right: 6px; }
.agchip { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 13px; padding: 6px 12px 6px 7px; border-radius: 999px; border: 1px solid var(--border-strong); color: var(--fg); background: var(--surface); }
.agchip small { color: var(--muted); font-size: 11px; }
.agchip.soon { border-style: dashed; color: var(--muted); }
.agchip.plain { padding-left: 12px; }
section.s { padding-block: 64px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 28px; scroll-margin-top: 70px; }
section.s .head { display: flex; flex-direction: column; gap: 10px; }
section.s .head p { color: var(--muted); font-size: 17px; }
.how { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 14px; align-items: stretch; }
.node { border: 1px solid var(--border); background: var(--surface); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.node .ic { font-size: 26px; line-height: 1; }
.node p { font-size: 14px; color: var(--muted); }
.node .win { display: flex; flex-direction: column; gap: 5px; margin-top: 6px; }
.node .win span { font-family: var(--mono); font-size: 12px; padding: 5px 8px; border-radius: 6px; background: var(--raised); display: flex; align-items: center; gap: 8px; }
.link { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; color: var(--muted); text-align: center; min-width: 120px; }
.link i { display: block; width: 100%; border-top: 2px dashed var(--border-strong); position: relative; }
.link i::before, .link i::after { content: ""; position: absolute; top: -5px; width: 8px; height: 8px; border-radius: 4px; background: var(--accent); }
.link i::before { left: -2px; } .link i::after { right: -2px; }
@media (max-width: 860px) { .how { grid-template-columns: 1fr; } .link { min-width: 0; padding: 4px 0; } .link i { width: 2px; height: 28px; border-top: 0; border-left: 2px dashed var(--border-strong); } .link i::before, .link i::after { left: -3px; } .link i::before { top: -4px; } .link i::after { top: auto; bottom: -4px; } }
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; counter-reset: step; list-style: none; margin: 0; padding: 0; }
.step { display: flex; gap: 14px; align-items: flex-start; }
.step::before { counter-increment: step; content: counter(step); flex: none; width: 30px; height: 30px; border-radius: 15px; background: var(--accent); color: var(--accent-ink); font-family: var(--mono); font-weight: 700; display: grid; place-items: center; font-size: 13px; }
.step b { display: block; font-family: var(--mono); font-size: 14px; margin-bottom: 2px; }
.step p { font-size: 14px; color: var(--muted); }
.feats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; }
.feat { border: 1px solid var(--border); background: var(--surface); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.feat .g { font-family: var(--mono); font-size: 20px; color: var(--accent-fg); line-height: 1; }
.feat p { font-size: 14px; color: var(--muted); }
.sec2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
.sec2 .it { display: flex; gap: 12px; align-items: flex-start; font-size: 15px; }
.sec2 .it i { flex: none; font-style: normal; color: var(--success); font-family: var(--mono); font-weight: 700; }
.sec2 .it b { font-family: var(--mono); font-size: 14px; display: block; }
.sec2 .it span { color: var(--muted); font-size: 14px; }
.install { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr); gap: 28px; }
.install .col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
@media (max-width: 860px) { .install { grid-template-columns: 1fr; } }
.tabs { display: flex; gap: 2px; border: 1px solid var(--border); border-radius: 10px; padding: 3px; width: max-content; max-width: 100%; }
.tabs button { padding: 7px 14px; border-radius: 8px; font-size: 13px; color: var(--muted); cursor: pointer; background: transparent; border: 0; }
.tabs button.on { background: var(--raised); color: var(--fg); font-weight: 600; }
.pane { display: flex; flex-direction: column; gap: 14px; }
.pane[hidden] { display: none; }
.cmd { display: flex; align-items: center; gap: 12px; background: #0d0d0d; color: #e8e6e3; border: 1px solid var(--border-strong); border-radius: 12px; padding: 14px 16px; font-family: var(--mono); font-size: 14px; min-width: 0; }
.cmd code { background: transparent; padding: 0; flex: 1; min-width: 0; overflow-x: auto; white-space: nowrap; color: inherit; font-size: inherit; }
.cmd code b { color: var(--accent); font-weight: 500; }
.cmd button { font-family: var(--mono); font-size: 12px; font-weight: 600; padding: 7px 12px; border-radius: 8px; border: 1px solid #3a3836; background: #1e1d1c; color: #e8e6e3; cursor: pointer; white-space: nowrap; }
.note { font-size: 14px; color: var(--muted); }
.reqs { display: flex; gap: 8px; flex-wrap: wrap; list-style: none; margin: 0; padding: 0; }
.reqs span { font-size: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
.stores { display: flex; flex-direction: column; gap: 10px; scroll-margin-top: 80px; }
.stores h3 { font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
.store { display: flex; align-items: center; gap: 12px; border: 1px solid var(--border-strong); background: var(--surface); border-radius: 12px; padding: 12px 14px; color: var(--fg); }
.store:hover { text-decoration: none; border-color: var(--accent); }
.store .ic { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-size: 20px; background: var(--raised); flex: none; font-family: var(--mono); }
.store b { display: block; font-family: var(--mono); font-size: 14px; }
.store small { color: var(--muted); font-size: 12px; }
.faq { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px 28px; }
details { border-top: 1px solid var(--border); padding: 12px 0; }
summary { cursor: pointer; font-family: var(--mono); font-size: 14px; font-weight: 600; list-style: none; display: flex; gap: 10px; }
summary::-webkit-details-marker { display: none; }
summary::before { content: "›"; color: var(--accent-fg); }
details[open] summary::before { content: "⌄"; }
details p { font-size: 14px; color: var(--muted); padding: 8px 0 0 20px; }
footer { padding-block: 36px 48px; display: flex; flex-direction: column; gap: 18px; }
footer .row { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; font-family: var(--mono); font-size: 13px; }
footer .row a { color: var(--muted); }
footer .row .brand { display: flex; align-items: center; gap: 8px; color: var(--fg); font-weight: 700; margin-right: auto; }
footer .row .brand svg { width: 20px; height: 20px; color: var(--accent); }
footer .row .langs { color: var(--dim); }
footer small { font-size: 11.5px; color: var(--dim); max-width: 80ch; }
@media (prefers-reduced-motion: no-preference) { .hero .shot .phone { animation: rise .7s ease-out both; } @keyframes rise { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } } }

/* phone mock (always the app's dark theme) */
.phone { --a-bg: #0d0d0d; --a-surface: #161616; --a-raised: #1e1d1c; --a-border: #2a2a2a; --a-border-strong: #3a3836; --a-fg: #e8e6e3; --a-muted: #8a8784; --a-dim: #5e5a56; --a-accent: #e8a33d; --a-accent-fg: #e8a33d; --a-accent-ink: #1a1206; --a-accent-soft: rgba(232, 163, 61, 0.16); --a-success: #7fb069; --a-danger: #e06c75; --a-warning: #f3dc7a; --a-info: #61afef; --a-frame: #151515;
  width: 390px; height: 844px; border-radius: 58px; background: var(--a-bg); border: 12px solid var(--a-frame); box-shadow: 0 0 0 2px #2c2c2c, 0 30px 70px rgba(0, 0, 0, 0.65); overflow: hidden; position: relative; display: flex; flex-direction: column; font-family: var(--mono); color: var(--a-fg); font-size: 13px; line-height: 1.4; flex: none; }
.phone::before { content: ""; position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 122px; height: 36px; border-radius: 20px; background: #000; z-index: 6; }
.phone .sb { height: 54px; display: flex; align-items: flex-end; justify-content: space-between; padding: 0 30px 8px; font: 600 15px/1 -apple-system, system-ui, sans-serif; flex: none; }
.phone .sb .ic { letter-spacing: 1px; font-size: 13px; }
.phone .home { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); width: 134px; height: 5px; border-radius: 3px; background: var(--a-fg); opacity: 0.85; z-index: 6; }
.app { flex: 1; display: flex; flex-direction: column; min-height: 0; position: relative; }
.ah { display: flex; align-items: center; gap: 6px; padding: 6px 12px 4px; flex: none; }
.ah .title { flex: 1; min-width: 0; font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 8px; white-space: nowrap; overflow: hidden; }
.ah .title svg { width: 20px; height: 20px; color: var(--a-accent-fg); flex: none; }
.ib { width: 36px; height: 36px; border-radius: 18px; display: grid; place-items: center; color: var(--a-fg); font-size: 17px; flex: none; }
.ib.accent { color: var(--a-accent-fg); }
.mline { display: flex; align-items: center; gap: 8px; padding: 0 16px 8px; font-size: 12px; color: var(--a-muted); flex: none; min-width: 0; overflow: hidden; }
.mline > span { white-space: nowrap; }
.mline .dot { display: inline-block; width: 8px; height: 8px; border-radius: 4px; background: var(--a-success); }
.mline .host { color: var(--a-fg); }
.chips { display: flex; gap: 6px; padding: 4px 14px 8px; align-items: center; flex: none; overflow: hidden; }
.chip { padding: 6px 10px; border-radius: 10px; border: 1px solid var(--a-border); background: var(--a-surface); font-size: 12px; white-space: nowrap; }
.chip.on { background: var(--a-accent); color: var(--a-accent-ink); border-color: var(--a-accent); font-weight: 600; }
.scroll { flex: 1; min-height: 0; overflow: hidden; padding: 0 14px; display: flex; flex-direction: column; gap: 10px; }
.attn { border: 1px solid var(--a-warning); background: color-mix(in srgb, var(--a-warning) 8%, var(--a-surface)); border-radius: 14px; padding: 10px 13px; display: flex; flex-direction: column; gap: 8px; }
.attn .h { display: flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: 0.08em; font-weight: 700; color: var(--a-warning); text-transform: uppercase; }
.attn .h span { margin-left: auto; letter-spacing: 0; text-transform: none; font-weight: 400; color: var(--a-muted); }
.attn .who { display: flex; gap: 8px; align-items: center; font-weight: 600; font-size: 13.5px; }
.attn .who span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attn .tool { font-size: 12px; color: var(--a-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.attn .tool b { color: var(--a-fg); font-weight: 400; }
.attn .ans { display: flex; gap: 8px; }
.attn .ans span { flex: 1; text-align: center; padding: 5px; font-size: 12px; border-radius: 8px; border: 1px solid var(--a-border-strong); background: var(--a-raised); font-weight: 600; }
.attn .ans .no { border-color: var(--a-danger); color: var(--a-danger); background: transparent; }
.attn .ans .ok { border-color: var(--a-success); color: var(--a-success); background: transparent; }
.srow { background: var(--a-surface); border: 1px solid var(--a-border); border-radius: 14px; padding: 11px 13px; display: flex; flex-direction: column; gap: 5px; }
.srow.waiting { border-color: var(--a-warning); }
.srow .t { display: flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 600; min-width: 0; }
.srow .t .title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.srow .p { color: var(--a-muted); font-size: 12px; display: flex; gap: 10px; min-width: 0; white-space: nowrap; overflow: hidden; }
.srow .m { display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--a-muted); flex-wrap: wrap; }
.ago { margin-left: auto; color: var(--a-dim); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; background: var(--a-raised); color: var(--a-muted); white-space: nowrap; }
.pill::before { content: ""; width: 6px; height: 6px; border-radius: 3px; background: currentColor; }
.pill.running { color: var(--a-accent-fg); background: var(--a-accent-soft); }
.pill.idle { color: var(--a-success); background: color-mix(in srgb, var(--a-success) 16%, transparent); }
.pill.waiting { color: var(--a-warning); background: color-mix(in srgb, var(--a-warning) 18%, transparent); }
.agent { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 5px; font-size: 9.5px; font-weight: 700; color: #0d0d0d; flex: none; letter-spacing: 0.02em; }
.agent.claude { background: var(--claude); }
.agent.codex { background: var(--codex); }
.agent.kimi { background: var(--kimi); }
.agent.qwen { background: var(--qwen); }
.ptag { font-size: 11px; font-weight: 700; }
.ptag.personal { color: #56b6c2; }
.ptag.work { color: #61afef; }

/* 404 */
.nf { min-height: 70vh; display: flex; flex-direction: column; justify-content: center; gap: 18px; padding-block: 64px; }
.nf .code { font-family: var(--mono); color: var(--muted); font-size: 13px; }

/* docs */
.docs { display: grid; grid-template-columns: 220px minmax(0, 1fr) 200px; gap: 40px; padding-block: 36px 64px; align-items: start; }
.docs .side { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 16px; }
.docnav { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; font-family: var(--mono); font-size: 13px; }
.docnav a { display: block; padding: 6px 10px; border-radius: 6px; color: var(--muted); }
.docnav a:hover { color: var(--fg); background: var(--surface); text-decoration: none; }
.docnav a[aria-current="page"] { color: var(--accent-fg); background: var(--accent-soft); font-weight: 600; }
.search { position: relative; margin: 0; }
.search input { width: 100%; font: 13px var(--mono); padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--fg); }
.search input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.results { list-style: none; margin: 6px 0 0; padding: 6px; border: 1px solid var(--border); border-radius: 10px; background: var(--raised); display: flex; flex-direction: column; gap: 2px; max-height: 50vh; overflow: auto; }
.results[hidden] { display: none; }
.results a { display: flex; flex-direction: column; gap: 2px; padding: 7px 9px; border-radius: 6px; font-family: var(--mono); font-size: 13px; color: var(--fg); }
.results a:hover { background: var(--surface); text-decoration: none; }
.results small { color: var(--muted); font-size: 11px; }
.results .none { color: var(--muted); font-family: var(--mono); font-size: 12px; padding: 6px 9px; }
.docs article { min-width: 0; display: flex; flex-direction: column; gap: 16px; font-size: 16px; }
.docs article h1 { font-size: clamp(28px, 4vw, 38px); }
.docs article h2 { font-size: 22px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border); }
.docs article h3 { font-size: 16px; margin-top: 8px; }
.docs article h2, .docs article h3 { scroll-margin-top: 80px; }
.docs article p, .docs article li { max-width: 70ch; }
.docs article ul, .docs article ol { margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 6px; }
.docs article pre { margin: 0; background: #0d0d0d; color: #e8e6e3; border: 1px solid var(--border-strong); border-radius: 12px; padding: 14px 16px; overflow-x: auto; font-size: 13px; line-height: 1.5; }
.docs article pre code { background: transparent; padding: 0; color: inherit; font-size: inherit; }
.docs article table { border-collapse: collapse; font-size: 14px; display: block; overflow-x: auto; }
.docs article th, .docs article td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; }
.docs article th { font-family: var(--mono); font-size: 12px; color: var(--muted); background: var(--surface); }
.docs article blockquote { margin: 0; padding: 10px 14px; border-left: 3px solid var(--accent); background: var(--surface); color: var(--muted); border-radius: 0 8px 8px 0; }
.docs article a { text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--accent-fg) 40%, transparent); }
.docs .anchor { margin-left: 8px; color: var(--dim); text-decoration: none; opacity: 0; font-weight: 400; }
.docs h2:hover .anchor, .docs h3:hover .anchor, .docs .anchor:focus { opacity: 1; }
.applies { font-family: var(--mono); font-size: 12px; color: var(--muted); border: 1px dashed var(--border-strong); border-radius: 999px; padding: 3px 10px; align-self: flex-start; }
.fallback { font-family: var(--mono); font-size: 13px; background: var(--accent-soft); border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); border-radius: 10px; padding: 10px 14px; }
.toc { position: sticky; top: 76px; font-size: 13px; }
.toc h2 { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.toc ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.toc a { color: var(--muted); }
.toc a:hover { color: var(--fg); }
.pn { display: flex; justify-content: space-between; gap: 16px; margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--border); font-family: var(--mono); }
.pn a { display: flex; flex-direction: column; gap: 2px; font-size: 14px; font-weight: 600; text-decoration: none; }
.pn a small { color: var(--muted); font-weight: 400; font-size: 11px; }
.pn .next { text-align: right; margin-left: auto; }
.docs-foot { border-top: 1px solid var(--border); }
@media (max-width: 1000px) { .docs { grid-template-columns: 220px minmax(0, 1fr); } .toc { display: none; } }
@media (max-width: 760px) { .docs { grid-template-columns: 1fr; gap: 24px; } .docs .side { position: static; } }
`
