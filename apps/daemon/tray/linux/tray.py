#!/usr/bin/env python3
"""Remote Harness tray icon (AppIndicator). The daemon starts it and sends the menu as JSON lines
on stdin; clicks go back as JSON lines on stdout. It quits when stdin closes (the daemon stopped).
Exits with status 3 when the toolkit is missing, so the daemon stays headless."""
import json
import os
import sys
import threading

try:
    import gi

    gi.require_version("Gtk", "3.0")
    from gi.repository import GLib, Gtk

    try:
        gi.require_version("AyatanaAppIndicator3", "0.1")
        from gi.repository import AyatanaAppIndicator3 as AppIndicator
    except (ValueError, ImportError):
        gi.require_version("AppIndicator3", "0.1")
        from gi.repository import AppIndicator3 as AppIndicator
except (ValueError, ImportError) as error:
    print(f"tray unavailable: {error}", file=sys.stderr)
    sys.exit(3)


def emit(message):
    sys.stdout.write(json.dumps(message) + "\n")
    sys.stdout.flush()


def build(items):
    menu = Gtk.Menu()
    for item in items:
        kind = item.get("type")
        if kind == "separator":
            menu.append(Gtk.SeparatorMenuItem())
            continue
        if kind == "submenu":
            entry = Gtk.MenuItem(label=item.get("label", ""))
            entry.set_submenu(build(item.get("items", [])))
        elif "checked" in item:
            entry = Gtk.CheckMenuItem(label=item.get("label", ""))
            entry.set_active(bool(item.get("checked")))
        else:
            entry = Gtk.MenuItem(label=item.get("label", ""))
        item_id = item.get("id")
        if item_id and kind != "submenu":
            entry.connect("activate", lambda _widget, i=item_id: emit({"type": "click", "id": i}))
        entry.set_sensitive(item.get("enabled", True))
        menu.append(entry)
    menu.show_all()
    return menu


indicator = AppIndicator.Indicator.new(
    "remote-harness", "utilities-terminal", AppIndicator.IndicatorCategory.APPLICATION_STATUS
)
# The Remote Harness mark (symbolic SVG generated next to this script); the theme icon above stays
# as the fallback when the file is missing. The same mark serves as the attention icon: the
# indicator's attention status is what signals "waiting for you" on Linux.
ICON_DIR = os.path.dirname(os.path.abspath(__file__))
ICON_NAME = "remote-harness-symbolic"
if os.path.exists(os.path.join(ICON_DIR, ICON_NAME + ".svg")):
    indicator.set_icon_theme_path(ICON_DIR)
    indicator.set_icon_full(ICON_NAME, "Remote Harness")
    indicator.set_attention_icon_full(ICON_NAME, "Remote Harness · waiting for you")
indicator.set_status(AppIndicator.IndicatorStatus.ACTIVE)
indicator.set_menu(build([]))


def apply(message):
    if message.get("type") == "menu":
        indicator.set_title(message.get("tooltip", "Remote Harness"))
        waiting = message.get("icon") == "waiting"
        indicator.set_status(
            AppIndicator.IndicatorStatus.ATTENTION if waiting else AppIndicator.IndicatorStatus.ACTIVE
        )
        indicator.set_menu(build(message.get("items", [])))
    return False


def read_stdin():
    for line in sys.stdin:
        try:
            message = json.loads(line)
        except ValueError:
            continue
        GLib.idle_add(apply, message)
    GLib.idle_add(Gtk.main_quit)


threading.Thread(target=read_stdin, daemon=True).start()
emit({"type": "ready"})
Gtk.main()
