import type { ServerMessageOf } from '@remote-harness/protocol'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { useTheme } from '@/core/theme'
import { XTERM_HTML } from './xterm-html.generated'
import { xtermTheme } from './xterm-theme'

export type TerminalViewHandle = {
  render(frame: Pick<ServerMessageOf<'pane.frame'>, 'text' | 'cols' | 'rows'>): void
}

/** Read-only xterm.js mirror of a tmux pane, drawn with the app theme (updated live on a switch). */
export const TerminalView = forwardRef<TerminalViewHandle, { onReady?: () => void }>(function TerminalView(
  { onReady },
  ref,
) {
  const webview = useRef<WebView>(null)
  const theme = useTheme()
  const xterm = useMemo(() => JSON.stringify(xtermTheme(theme)), [theme])
  useImperativeHandle(ref, () => ({
    render(frame) {
      const payload = JSON.stringify({ text: frame.text, cols: frame.cols, rows: frame.rows })
      webview.current?.injectJavaScript(`window.renderFrame && window.renderFrame(${payload});true;`)
    },
  }))
  useEffect(() => {
    webview.current?.injectJavaScript(`window.setTheme && window.setTheme(${xterm});true;`)
  }, [xterm])
  return (
    <WebView
      ref={webview}
      source={{ html: XTERM_HTML }}
      // The page reads the theme before its own scripts run, so the first paint has the colors.
      injectedJavaScriptBeforeContentLoaded={`window.__theme = ${xterm};true;`}
      // Inline HTML loads as about:blank; allow it, but never navigate anywhere else.
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
      style={[styles.web, { backgroundColor: theme.colors.background }]}
      scrollEnabled={false}
      javaScriptEnabled
      // Android: the page is self-contained, so no file/content access, popups or mixed content.
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      setSupportMultipleWindows={false}
      mixedContentMode="never"
      overScrollMode="never"
      onMessage={(e) => {
        if (e.nativeEvent.data === 'ready') onReady?.()
      }}
    />
  )
})

const styles = StyleSheet.create({ web: { flex: 1 } })
