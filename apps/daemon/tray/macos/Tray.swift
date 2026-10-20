// Remote Harness menu bar icon. The daemon starts it and sends the menu as JSON lines on stdin;
// clicks go back as JSON lines on stdout. It quits when stdin closes (the daemon stopped).
import AppKit
import CoreImage

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

struct TrayMessage: Decodable {
  let type: String
  let tooltip: String?
  /// Glyph state: `idle`, `working`, `waiting` or `offline` (absent = idle).
  let icon: String?
  let items: [TrayItem]?
}

final class Tray: NSObject {
  private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
  private var state = "idle"

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

  /// A menu item showing `text` as a QR code (the pairing link), on white with a quiet zone so the
  /// phone's camera reads it in light and dark mode. Nil when CoreImage cannot encode it.
  private static func qrItem(_ text: String) -> NSMenuItem? {
    guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
    filter.setValue(Data(text.utf8), forKey: "inputMessage")
    filter.setValue("M", forKey: "inputCorrectionLevel")
    guard let output = filter.outputImage else { return nil }
    let scale = (qrSide * 2) / output.extent.width
    let scaled = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let rep = NSCIImageRep(ciImage: scaled)
    let image = NSImage(size: NSSize(width: qrSide, height: qrSide))
    image.addRepresentation(rep)

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
