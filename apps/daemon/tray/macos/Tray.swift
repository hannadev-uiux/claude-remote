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
      if let image = NSImage(systemSymbolName: "terminal", accessibilityDescription: "Remote Harness") {
        image.isTemplate = true
        button.image = image
      } else {
        button.title = "RH"
      }
    }
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
