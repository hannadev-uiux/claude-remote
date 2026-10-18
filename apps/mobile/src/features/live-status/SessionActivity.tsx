import { Button, HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import {
  activityBackgroundTint,
  clipShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
  resizable,
  strokeBorder,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers'
import { LIVE_ACTIVITY_NAME, type LiveStatusProps } from '@remote-harness/protocol'
import { createLiveActivity } from 'expo-widgets'

/**
 * Lock screen and Dynamic Island layout of a session's live status. It runs in the widget runtime:
 * only `@expo/ui/swift-ui`, no app state, no imports used inside, so the texts arrive translated in
 * the props, the colors arrive in `props.palette` (the app theme; the literals below are the dark
 * theme, used when an older daemon sends none) and props from older daemons may lack the fields
 * after `startedAt`. The mark (`LiveActivityIcon`, from the widget extension's asset catalog) is the
 * only icon; color encodes only the state (border, timer, state line, current glyph). The Deny and
 * Allow buttons carry `deny:<requestId>` / `allow:<requestId>` as their target; the app answers them.
 */
function SessionActivityLayout(props: LiveStatusProps) {
  'widget'
  const palette = props.palette
  const background = palette ? palette.background : '#0D0D0D'
  const text = palette ? palette.text : '#E8E6E3'
  const textMuted = palette ? palette.textMuted : '#8A8784'
  const accent = palette ? palette.accent : '#E8A33D'
  const success = palette ? palette.success : '#7FB069'
  const warning = palette ? palette.warning : '#F3DC7A'
  const state = props.state
  const tint =
    state === 'waiting' ? warning : state === 'done' ? success : state === 'closed' ? textMuted : accent
  const working = state === 'working'
  const finished = state === 'done' || state === 'closed'
  const endedAt = props.endedAt ?? null
  const header = props.host ? `${props.title} · ${props.host}` : props.title
  const glyphs = props.glyphs ?? []
  const pending = props.pending ?? null
  const hint = props.hint ?? ''
  const stateLine = [props.status, props.step, props.tools].filter((part) => part.length > 0).join(' · ')
  // Oldest on the left, the current step on the right; repeated glyphs get their own stable key.
  const seen: Record<string, number> = {}
  const ordered = [...glyphs].reverse().map((glyph) => {
    seen[glyph] = (seen[glyph] ?? 0) + 1
    return { glyph, key: `${glyph}-${seen[glyph]}` }
  })

  const twoDigits = (value: number) => (value < 10 ? `0${value}` : `${value}`)
  const duration = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = twoDigits(total % 60)
    return hours > 0 ? `${hours}:${twoDigits(minutes)}:${seconds}` : `${minutes}:${seconds}`
  }

  const mark = (size: number) => (
    <Image
      assetName="LiveActivityIcon"
      modifiers={[resizable(), frame({ width: size, height: size }), clipShape('roundedRectangle', size / 4)]}
    />
  )
  const timerStyle = (size: number) => [
    font({ size, weight: 'semibold', design: 'monospaced' }),
    monospacedDigit(),
    foregroundStyle(tint),
  ]
  // Running or waiting: ticks on its own. Ended: frozen at the turn's duration, with the hint.
  const timer = (size: number, maxWidth: number) =>
    !finished ? (
      <Text
        date={new Date(props.startedAt)}
        dateStyle="timer"
        modifiers={[...timerStyle(size), frame({ maxWidth })]}
      />
    ) : endedAt !== null ? (
      <Text modifiers={timerStyle(size)}>{duration(endedAt - props.startedAt)}</Text>
    ) : null
  const sessionName = props.session ? (
    <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(text), lineLimit(1)]}>
      {props.session}
    </Text>
  ) : null
  const folder = props.path ? (
    <Text
      modifiers={[
        font({ size: 12, design: 'monospaced' }),
        foregroundStyle(textMuted),
        lineLimit(1),
        truncationMode('head'),
      ]}
    >
      {props.path}
    </Text>
  ) : null
  const stateText = (
    <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(tint), lineLimit(1)]}>
      {stateLine}
    </Text>
  )
  const glyphRow =
    ordered.length > 0 ? (
      <HStack spacing={8}>
        {ordered.map(({ glyph, key }, index) => (
          <Text
            key={key}
            modifiers={[
              font({ size: 13, weight: 'semibold', design: 'monospaced' }),
              foregroundStyle(index === ordered.length - 1 ? tint : textMuted),
            ]}
          >
            {glyph}
          </Text>
        ))}
      </HStack>
    ) : null
  const actions = pending ? (
    <HStack spacing={10}>
      {/* biome-ignore lint/a11y/useValidAriaRole: SwiftUI button role, not an ARIA role */}
      <Button label={pending.deny} role="destructive" target={`deny:${pending.requestId}`} />
      <Button
        label={pending.allow}
        target={`allow:${pending.requestId}`}
        modifiers={[foregroundStyle(success)]}
      />
    </HStack>
  ) : null
  const hintText =
    hint && state === 'closed' ? (
      <Text modifiers={[font({ size: 12 }), foregroundStyle(textMuted), lineLimit(1)]}>{hint}</Text>
    ) : null
  const totalText =
    hint && state === 'done' ? (
      <Text modifiers={[font({ size: 11 }), foregroundStyle(textMuted)]}>{hint}</Text>
    ) : null
  const stateDot = <Text modifiers={[font({ size: 10 }), foregroundStyle(tint)]}>●</Text>

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[
          padding({ all: 14 }),
          activityBackgroundTint(background),
          strokeBorder({ content: tint, style: { lineWidth: 2 }, shape: 'containerRelativeShape' }),
        ]}
      >
        <HStack spacing={10}>
          {mark(24)}
          <VStack alignment="leading" spacing={2}>
            <Text
              modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(textMuted), lineLimit(1)]}
            >
              {header}
            </Text>
            {sessionName}
            {folder}
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={0}>
            {timer(28, 120)}
            {totalText}
          </VStack>
        </HStack>
        {working ? <ProgressView modifiers={[foregroundStyle(tint)]} /> : null}
        <HStack spacing={8}>
          {stateText}
          <Spacer />
          {glyphRow}
        </HStack>
        {hintText}
        {actions}
      </VStack>
    ),
    compactLeading: mark(20),
    compactTrailing: !finished ? (
      timer(14, 56)
    ) : glyphs[0] ? (
      <Text modifiers={[font({ size: 13, design: 'monospaced' }), foregroundStyle(tint)]}>{glyphs[0]}</Text>
    ) : (
      stateDot
    ),
    minimal: (
      <HStack spacing={2}>
        {mark(16)}
        {stateDot}
      </HStack>
    ),
    expandedLeading: (
      <HStack spacing={6}>
        {mark(20)}
        <Text modifiers={[font({ weight: 'semibold' }), lineLimit(1)]}>{header}</Text>
      </HStack>
    ),
    expandedTrailing: timer(16, 76),
    expandedBottom: (
      <VStack alignment="leading" spacing={4}>
        {sessionName}
        {folder}
        <HStack spacing={8}>
          {stateText}
          <Spacer />
          {glyphRow}
        </HStack>
        {hintText}
        {actions}
      </VStack>
    ),
  }
}

export const SessionActivity = createLiveActivity<LiveStatusProps>(LIVE_ACTIVITY_NAME, SessionActivityLayout)
