import type { ServerMessageOf } from '@claude-remote/protocol'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { colors } from '@/core/theme'
import { XTERM_HTML } from './xterm-html.generated'

export type TerminalViewHandle = {
  render(frame: Pick<ServerMessageOf<'pane.frame'>, 'text' | 'cols' | 'rows'>): void
}

/** Read-only xterm.js mirror of a tmux pane. */
export const TerminalView = forwardRef<TerminalViewHandle, { onReady?: () => void }>(function TerminalView(
  { onReady },
  ref,
) {
  const webview = useRef<WebView>(null)
  useImperativeHandle(ref, () => ({
    render(frame) {
      const payload = JSON.stringify({ text: frame.text, cols: frame.cols, rows: frame.rows })
      webview.current?.injectJavaScript(`window.renderFrame && window.renderFrame(${payload});true;`)
    },
  }))
  return (
    <WebView
      ref={webview}
      source={{ html: XTERM_HTML }}
      originWhitelist={['about:blank']}
      style={styles.web}
      scrollEnabled={false}
      javaScriptEnabled
      onMessage={(e) => {
        if (e.nativeEvent.data === 'ready') onReady?.()
      }}
    />
  )
})

const styles = StyleSheet.create({ web: { flex: 1, backgroundColor: colors.background } })
