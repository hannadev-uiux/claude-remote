// Remote Harness menu bar icon. The daemon starts it and sends the menu as JSON lines on stdin;
// clicks go back as JSON lines on stdout. It quits when stdin closes (the daemon stopped).
import AppKit
import CoreImage
import SwiftUI

struct TrayItem: Decodable {
  let id: String?
  let label: String?
  let enabled: Bool?
  let checked: Bool?
  let type: String?
  let items: [TrayItem]?
  /// Contents of a `qr` item.
  let text: String?
}

/// One row of a Preferences window section — mirrors the daemon's `PrefRow` union; unused fields
/// for a given `kind` stay nil. Every label/hint/value is already translated by the daemon.
struct PrefRowWire: Decodable {
  let kind: String
  let id: String?
  let label: String?
  let hint: String?
  let checked: Bool?
  let value: String?
  let options: [PrefOptionWire]?
  let style: String?
  let text: String?
}
struct PrefOptionWire: Decodable {
  let id: String
  let label: String
  let checked: Bool
}
struct PrefSectionWire: Decodable {
  let rows: [PrefRowWire]
}
struct PrefTabWire: Decodable, Identifiable {
  let id: String
  let label: String
  let sections: [PrefSectionWire]
}
struct TrayPrefsWindowWire: Decodable {
  let title: String
  let tabs: [PrefTabWire]
}

struct TraySessionWire: Decodable, Identifiable {
  let id: String
  let title: String
  let folder: String
  let profile: String
  let state: String
  let worktree: Bool
  let controllable: Bool
  let agent: String
  let updatedAt: String
}
struct TraySessionsActionsWire: Decodable {
  let focus: String
  let rename: String
  let close: String
  let copyPath: String
}
struct TrayRenamePromptWire: Decodable {
  let title: String
  let confirm: String
  let cancel: String
}
struct TraySessionsWindowWire: Decodable {
  let title: String
  let searchPlaceholder: String
  let actions: TraySessionsActionsWire
  let renamePrompt: TrayRenamePromptWire
}

struct TrayMessage: Decodable {
  let type: String
  let tooltip: String?
  /// Glyph state: `idle`, `working`, `waiting` or `offline` (absent = idle).
  let icon: String?
  let items: [TrayItem]?
  /// Full, uncapped session list; present only once the daemon knows this helper opens windows.
  let sessions: [TraySessionWire]?
  let sessionsWindow: TraySessionsWindowWire?
  let prefsWindow: TrayPrefsWindowWire?
}

/// Data the Preferences/Sessions windows render; updated on the main thread as menu messages
/// arrive, so SwiftUI redraws both windows live without either needing its own round trip.
final class TrayState: ObservableObject {
  @Published var sessions: [TraySessionWire] = []
  @Published var sessionsWindow: TraySessionsWindowWire?
  @Published var prefsWindow: TrayPrefsWindowWire?
}

final class Tray: NSObject {
  private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
  private var state = "idle"
  let data = TrayState()
  private var prefsWindow: NSWindow?
  private var sessionsWindow: NSWindow?

  override init() {
    super.init()
    if let button = statusItem.button {
      button.image = Tray.glyph("idle")
      button.image?.accessibilityDescription = "Remote Harness"
    }
  }

  /// The Remote Harness mark in its bold weight (three reins meeting in one ring), drawn from the
  /// same geometry as the app icon (256-unit box). Color encodes only the state: `idle` is a template
  /// image (macOS tints it for light and dark menu bars), `working` fills the ring, `waiting` adds
  /// the amber dot (the one color allowed in the menu bar) over label-colored strokes.
  private static func glyph(_ state: String) -> NSImage {
    let colored = state == "waiting"
    let image = NSImage(size: NSSize(width: 18, height: 18), flipped: true) { rect in
      let s = rect.width / 256
      let p = { (x: CGFloat, y: CGFloat) in NSPoint(x: x * s, y: y * s) }
      (colored ? NSColor.labelColor : NSColor.black).set()
      let strokes = NSBezierPath()
      strokes.lineWidth = 34 * s
      strokes.lineCapStyle = .round
      strokes.lineJoinStyle = .round
      strokes.appendOval(in: NSRect(x: 92 * s, y: 150 * s, width: 72 * s, height: 72 * s))
      strokes.move(to: p(128, 150))
      strokes.line(to: p(128, 70))
      strokes.move(to: p(108, 156))
      strokes.curve(to: p(56, 84), controlPoint1: p(100, 122), controlPoint2: p(86, 104))
      strokes.move(to: p(148, 156))
      strokes.curve(to: p(200, 84), controlPoint1: p(156, 122), controlPoint2: p(170, 104))
      strokes.stroke()
      if state == "working" {
        NSBezierPath(ovalIn: NSRect(x: 104 * s, y: 162 * s, width: 48 * s, height: 48 * s)).fill()
      }
      for (x, y) in [(104, 24), (28, 46), (180, 46)] as [(CGFloat, CGFloat)] {
        let node = NSRect(x: x * s, y: y * s, width: 48 * s, height: 48 * s)
        NSBezierPath(roundedRect: node, xRadius: 12 * s, yRadius: 12 * s).fill()
      }
      if colored {
        // Amber accent (#E8A33D), the only color the glyph ever carries.
        NSColor(calibratedRed: 0.91, green: 0.64, blue: 0.24, alpha: 1).set()
        NSBezierPath(ovalIn: NSRect(x: 176 * s, y: 164 * s, width: 64 * s, height: 64 * s)).fill()
      }
      return true
    }
    image.isTemplate = !colored
    return image
  }

  func apply(_ message: TrayMessage) {
    guard message.type == "menu" else { return }
    let next = message.icon ?? "idle"
    if next != state, let button = statusItem.button {
      state = next
      button.image = Tray.glyph(next)
      button.image?.accessibilityDescription = "Remote Harness"
      button.alphaValue = next == "offline" ? 0.4 : 1
    }
    statusItem.button?.toolTip = message.tooltip
    statusItem.menu = build(message.items ?? [])
    if let sessions = message.sessions { data.sessions = sessions }
    if let sessionsWindow = message.sessionsWindow { data.sessionsWindow = sessionsWindow }
    if let prefsWindow = message.prefsWindow { data.prefsWindow = prefsWindow }
  }

  private func build(_ items: [TrayItem]) -> NSMenu {
    let menu = NSMenu()
    menu.autoenablesItems = false
    for item in items {
      if item.type == "separator" {
        menu.addItem(.separator())
        continue
      }
      if item.type == "qr" {
        if let text = item.text, let entry = Tray.qrItem(text) { menu.addItem(entry) }
        continue
      }
      let entry = NSMenuItem(title: item.label ?? "", action: nil, keyEquivalent: "")
      if item.type == "submenu" {
        entry.submenu = build(item.items ?? [])
      } else if let id = item.id {
        entry.target = self
        entry.action = #selector(clicked(_:))
        entry.representedObject = id
        entry.isEnabled = item.enabled ?? true
        entry.state = (item.checked ?? false) ? .on : .off
      }
      menu.addItem(entry)
    }
    return menu
  }

  /// Side of the pairing QR code in the menu, in points.
  private static let qrSide: CGFloat = 200

  /// `text` as a white-on-quiet-zone QR code, legible in light and dark mode. Nil when CoreImage
  /// cannot encode it (shared by the menu's `qr` item and the Preferences window's Pairing tab).
  private static func qrNSImage(_ text: String) -> NSImage? {
    guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
    filter.setValue(Data(text.utf8), forKey: "inputMessage")
    filter.setValue("M", forKey: "inputCorrectionLevel")
    guard let output = filter.outputImage else { return nil }
    let scale = (qrSide * 2) / output.extent.width
    let scaled = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let rep = NSCIImageRep(ciImage: scaled)
    let image = NSImage(size: NSSize(width: qrSide, height: qrSide))
    image.addRepresentation(rep)
    return image
  }

  /// A menu item showing `text` as a QR code (the pairing link), on white with a quiet zone so the
  /// phone's camera reads it in light and dark mode. Nil when CoreImage cannot encode it.
  private static func qrItem(_ text: String) -> NSMenuItem? {
    guard let image = qrNSImage(text) else { return nil }
    let padding: CGFloat = 12
    let side = qrSide + padding * 2
    let container = NSView(frame: NSRect(x: 0, y: 0, width: side + 32, height: side + 16))
    let card = NSView(frame: NSRect(x: 16, y: 8, width: side, height: side))
    card.wantsLayer = true
    card.layer?.backgroundColor = NSColor.white.cgColor
    card.layer?.cornerRadius = 8
    let view = NSImageView(frame: NSRect(x: padding, y: padding, width: qrSide, height: qrSide))
    view.image = image
    view.imageScaling = .scaleProportionallyUpOrDown
    view.setAccessibilityLabel("Pairing QR code")
    card.addSubview(view)
    container.addSubview(card)
    let entry = NSMenuItem()
    entry.view = container
    return entry
  }

  @objc private func clicked(_ sender: NSMenuItem) {
    guard let id = sender.representedObject as? String else { return }
    dispatch(id)
  }

  /// Ids a helper with windows never sends to the daemon: it already has everything it needs
  /// cached in `data` to open the right window itself.
  func dispatch(_ id: String) {
    if id == "prefs", data.prefsWindow != nil {
      showPreferences()
    } else if id == "see-all" {
      showSessions()
    } else if id.hasPrefix("rename:") {
      promptRename(sessionId: String(id.dropFirst("rename:".count)))
    } else {
      sendAction(id, nil)
    }
  }

  /// Confirms destructive buttons (the window has no nested-submenu trick the menu uses) and sends
  /// everything else straight through.
  func sendAction(_ id: String, _ value: String?, confirmLabel: String? = nil) {
    if let confirmLabel, !Tray.confirm(confirmLabel) { return }
    var payload: [String: Any] = ["type": "click", "id": id]
    if let value { payload["value"] = value }
    emit(payload)
  }

  private static func confirm(_ label: String) -> Bool {
    let alert = NSAlert()
    alert.messageText = label
    alert.addButton(withTitle: label)
    alert.addButton(withTitle: "Cancel")
    NSApp.activate(ignoringOtherApps: true)
    return alert.runModal() == .alertFirstButtonReturn
  }

  private func promptRename(sessionId: String) {
    let prompt = data.sessionsWindow?.renamePrompt
    let alert = NSAlert()
    alert.messageText = prompt?.title ?? "Rename session"
    alert.addButton(withTitle: prompt?.confirm ?? "Rename")
    alert.addButton(withTitle: prompt?.cancel ?? "Cancel")
    let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
    field.stringValue = data.sessions.first(where: { $0.id == sessionId })?.title ?? ""
    alert.accessoryView = field
    alert.window.initialFirstResponder = field
    NSApp.activate(ignoringOtherApps: true)
    guard alert.runModal() == .alertFirstButtonReturn else { return }
    let name = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !name.isEmpty else { return }
    emit(["type": "click", "id": "rename:\(sessionId)", "value": name])
  }

  private func showPreferences() {
    if prefsWindow == nil {
      let hosting = NSHostingController(rootView: PreferencesView(state: data, tray: self))
      let window = NSWindow(contentViewController: hosting)
      window.styleMask = [.titled, .closable, .miniaturizable]
      window.isReleasedWhenClosed = false
      window.center()
      prefsWindow = window
    }
    prefsWindow?.title = data.prefsWindow?.title ?? "Preferences"
    NSApp.activate(ignoringOtherApps: true)
    prefsWindow?.makeKeyAndOrderFront(nil)
  }

  private func showSessions() {
    if sessionsWindow == nil {
      let hosting = NSHostingController(rootView: SessionsView(state: data, tray: self))
      let window = NSWindow(contentViewController: hosting)
      window.styleMask = [.titled, .closable, .miniaturizable, .resizable]
      window.isReleasedWhenClosed = false
      window.center()
      sessionsWindow = window
    }
    sessionsWindow?.title = data.sessionsWindow?.title ?? "Sessions"
    NSApp.activate(ignoringOtherApps: true)
    sessionsWindow?.makeKeyAndOrderFront(nil)
  }
}

// MARK: - Preferences window

struct PreferencesView: View {
  @ObservedObject var state: TrayState
  let tray: Tray

  var body: some View {
    TabView {
      ForEach(state.prefsWindow?.tabs ?? []) { tab in
        Form {
          ForEach(Array(tab.sections.enumerated()), id: \.offset) { _, section in
            ForEach(Array(section.rows.enumerated()), id: \.offset) { _, row in
              PrefRowView(row: row, tray: tray)
            }
          }
        }
        .padding(16)
        .tabItem { Text(tab.label) }
        .tag(tab.id)
      }
    }
    .frame(width: 480, height: 380)
  }
}

struct PrefRowView: View {
  let row: PrefRowWire
  let tray: Tray
  @State private var text: String = ""

  var body: some View {
    switch row.kind {
    case "toggle":
      Toggle(
        isOn: Binding(get: { row.checked ?? false }, set: { _ in tray.sendAction(row.id ?? "", nil) })
      ) {
        VStack(alignment: .leading, spacing: 2) {
          Text(row.label ?? "")
          if let hint = row.hint {
            Text(hint).font(.caption).foregroundStyle(.secondary)
          }
        }
      }
    case "text":
      HStack {
        Text(row.label ?? "")
        Spacer()
        TextField("", text: $text)
          .frame(width: 200)
          .onAppear { text = row.value ?? "" }
          .onSubmit { tray.sendAction(row.id ?? "", text) }
      }
    case "value":
      HStack {
        Text(row.label ?? "")
        Spacer()
        Text(row.value ?? "").foregroundStyle(.secondary)
      }
    case "picker":
      Picker(
        row.label ?? "",
        selection: Binding(
          get: { row.options?.first(where: { $0.checked })?.id ?? "" },
          set: { newId in tray.sendAction(newId, nil) }
        )
      ) {
        ForEach(row.options ?? [], id: \.id) { option in Text(option.label).tag(option.id) }
      }
    case "button":
      Button(row.label ?? "") {
        tray.sendAction(row.id ?? "", nil, confirmLabel: row.style == "destructive" ? row.label : nil)
      }
    case "qr":
      if let text = row.text, let image = Tray.qrForPreview(text) {
        Image(nsImage: image).resizable().frame(width: 160, height: 160).padding(.vertical, 4)
      }
    case "note":
      Text(row.label ?? "").font(.caption).foregroundStyle(.secondary)
    default:
      EmptyView()
    }
  }
}

extension Tray {
  /// Exposes the private QR generator to `PrefRowView` without widening its access elsewhere.
  fileprivate static func qrForPreview(_ text: String) -> NSImage? { qrNSImage(text) }
}

// MARK: - Sessions window

struct SessionsView: View {
  @ObservedObject var state: TrayState
  let tray: Tray
  @State private var query = ""

  var filtered: [TraySessionWire] {
    guard !query.isEmpty else { return state.sessions }
    return state.sessions.filter {
      $0.title.localizedCaseInsensitiveContains(query) || $0.folder.localizedCaseInsensitiveContains(query)
    }
  }

  var body: some View {
    VStack(spacing: 0) {
      TextField(state.sessionsWindow?.searchPlaceholder ?? "", text: $query)
        .textFieldStyle(.roundedBorder)
        .padding(10)
      List(filtered) { session in
        SessionRowView(session: session, actions: state.sessionsWindow?.actions, tray: tray)
      }
    }
    .frame(minWidth: 480, idealWidth: 560, minHeight: 320, idealHeight: 440)
  }
}

struct SessionRowView: View {
  let session: TraySessionWire
  let actions: TraySessionsActionsWire?
  let tray: Tray

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 2) {
        Text(session.title).bold()
        Text("\(session.folder) · \(session.agent) · \(session.state)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      Spacer()
      Button(actions?.focus ?? "Focus") { tray.sendAction("focus:\(session.id)", nil) }
        .disabled(!session.controllable)
      Button(actions?.rename ?? "Rename…") { tray.dispatch("rename:\(session.id)") }
      Button(actions?.close ?? "Close") { tray.sendAction("close:\(session.id)", nil) }
        .disabled(!session.controllable)
      Button(actions?.copyPath ?? "Copy path") {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(session.folder, forType: .string)
      }
    }
    .padding(.vertical, 4)
  }
}

func emit(_ object: [String: Any]) {
  guard let data = try? JSONSerialization.data(withJSONObject: object),
    let line = String(data: data, encoding: .utf8)
  else { return }
  FileHandle.standardOutput.write(Data((line + "\n").utf8))
}

let app = NSApplication.shared
// Menu bar only: no Dock icon, no main window.
app.setActivationPolicy(.accessory)
let tray = Tray()

Thread.detachNewThread {
  while let line = readLine() {
    guard let data = line.data(using: .utf8),
      let message = try? JSONDecoder().decode(TrayMessage.self, from: data)
    else { continue }
    DispatchQueue.main.async { tray.apply(message) }
  }
  DispatchQueue.main.async { exit(0) }
}

emit(["type": "ready", "windows": true])
app.run()
