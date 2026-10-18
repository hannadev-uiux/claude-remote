// Remote Harness menu bar icon. The daemon starts it and sends the menu as JSON lines on stdin;
// clicks go back as JSON lines on stdout. It quits when stdin closes (the daemon stopped).
import AppKit

struct TrayItem: Decodable {
  let id: String?
  let label: String?
  let enabled: Bool?
  let checked: Bool?
  let type: String?
  let items: [TrayItem]?
}

struct TrayMessage: Decodable {
  let type: String
  let tooltip: String?
  let items: [TrayItem]?
}

final class Tray: NSObject {
  private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

  override init() {
    super.init()
    if let button = statusItem.button {
      button.image = Tray.glyph()
      button.image?.accessibilityDescription = "Remote Harness"
    }
  }

  /// The Remote Harness mark in its bold weight (three reins meeting in one ring), drawn from the
  /// same geometry as the app icon (256-unit box) as a template image, so macOS tints it for light
  /// and dark menu bars.
  private static func glyph() -> NSImage {
    let image = NSImage(size: NSSize(width: 18, height: 18), flipped: true) { rect in
      let s = rect.width / 256
      let p = { (x: CGFloat, y: CGFloat) in NSPoint(x: x * s, y: y * s) }
      NSColor.black.set()
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
      for (x, y) in [(104, 24), (28, 46), (180, 46)] as [(CGFloat, CGFloat)] {
        let node = NSRect(x: x * s, y: y * s, width: 48 * s, height: 48 * s)
        NSBezierPath(roundedRect: node, xRadius: 12 * s, yRadius: 12 * s).fill()
      }
      return true
    }
    image.isTemplate = true
    return image
  }

  func apply(_ message: TrayMessage) {
    guard message.type == "menu" else { return }
    statusItem.button?.toolTip = message.tooltip
    statusItem.menu = build(message.items ?? [])
  }

  private func build(_ items: [TrayItem]) -> NSMenu {
    let menu = NSMenu()
    menu.autoenablesItems = false
    for item in items {
      if item.type == "separator" {
        menu.addItem(.separator())
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

  @objc private func clicked(_ sender: NSMenuItem) {
    guard let id = sender.representedObject as? String else { return }
    emit(["type": "click", "id": id])
  }
}

func emit(_ object: [String: String]) {
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

emit(["type": "ready"])
app.run()
