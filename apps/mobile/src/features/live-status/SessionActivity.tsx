import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui'
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
 * after `startedAt`. The app icon comes from the widget extension's asset catalog
 * (`withLiveActivityIcon` in `app.config.ts`). The state is the border color; the footer counts the
 * time since it changed.
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
  const tint =
    props.state === 'waiting'
      ? warning
      : props.state === 'done'
        ? success
        : props.state === 'closed'
          ? textMuted
          : accent
  const symbol =
    props.state === 'waiting'
      ? 'hand.raised.fill'
      : props.state === 'done'
        ? 'checkmark.circle.fill'
        : props.state === 'closed'
          ? 'xmark.circle.fill'
          : 'terminal.fill'
  const finished = props.state === 'done' || props.state === 'closed'
  const endedAt = props.endedAt ?? null
  const host = props.host || props.title
  const recent = props.recent ?? []
  const [agoBefore = '', agoAfter = ''] = (props.ago || '{time}').split('{time}')

  const twoDigits = (value: number) => (value < 10 ? `0${value}` : `${value}`)
  const duration = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = twoDigits(total % 60)
    return hours > 0 ? `${hours}:${twoDigits(minutes)}:${seconds}` : `${minutes}:${seconds}`
  }

  const timerStyle = [
    font({ size: 15, weight: 'semibold', design: 'monospaced' }),
    monospacedDigit(),
    foregroundStyle(tint),
  ]
  // Running: ticks on its own. Ended: frozen at the turn's duration.
  const elapsed = !finished ? (
    <Text
      date={new Date(props.startedAt)}
      dateStyle="timer"
      modifiers={[...timerStyle, frame({ maxWidth: 76 })]}
    />
  ) : endedAt !== null ? (
    <Text modifiers={timerStyle}>{duration(endedAt - props.startedAt)}</Text>
  ) : null
  const appIcon = (size: number) => (
    <Image
      assetName="LiveActivityIcon"
      modifiers={[resizable(), frame({ width: size, height: size }), clipShape('roundedRectangle', size / 4)]}
    />
  )
  const stateIcon = <Image systemName={symbol} modifiers={[foregroundStyle(tint)]} />
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
  const since = props.changedAt ? (
    <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(tint), lineLimit(1)]}>
      {`${props.status} · ${agoBefore}`}
      <Text date={new Date(props.changedAt)} dateStyle="relative" />
      {agoAfter}
    </Text>
  ) : (
    <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(tint), lineLimit(1)]}>
      {props.status}
    </Text>
  )
  // Up to three lines, newest first and brightest; older daemons send only the current step.
  const [latest, previous, oldest] =
    recent.length > 0 ? recent : [props.step].filter((step) => step.length > 0)
  const stepLine = (line: string | undefined, color: string) =>
    line ? (
      <Text modifiers={[font({ size: 12 }), foregroundStyle(color), lineLimit(1)]}>{`› ${line}`}</Text>
    ) : null

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
          {appIcon(28)}
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(text), lineLimit(1)]}>
            {host}
          </Text>
          <Spacer />
          {elapsed}
        </HStack>
        {sessionName || folder ? (
          <VStack alignment="leading" spacing={2}>
            {sessionName}
            {folder}
          </VStack>
        ) : null}
        {latest ? (
          <VStack alignment="leading" spacing={2}>
            {stepLine(latest, text)}
            {stepLine(previous, textMuted)}
            {stepLine(oldest, textMuted)}
          </VStack>
        ) : null}
        <HStack spacing={6}>
          {since}
          <Spacer />
          {props.tools ? (
            <Text modifiers={[font({ size: 12 }), foregroundStyle(textMuted)]}>{props.tools}</Text>
          ) : null}
        </HStack>
      </VStack>
    ),
    compactLeading: stateIcon,
    compactTrailing: !finished ? (
      <Text
        date={new Date(props.startedAt)}
        dateStyle="timer"
        modifiers={[monospacedDigit(), foregroundStyle(tint), frame({ maxWidth: 52 })]}
      />
    ) : endedAt !== null ? (
      <Text modifiers={[monospacedDigit(), foregroundStyle(tint)]}>
        {duration(endedAt - props.startedAt)}
      </Text>
    ) : (
      stateIcon
    ),
    minimal: stateIcon,
    expandedLeading: (
      <HStack spacing={6}>
        {appIcon(20)}
        <Text modifiers={[font({ weight: 'semibold' }), lineLimit(1)]}>{host}</Text>
      </HStack>
    ),
    expandedTrailing: elapsed,
    expandedBottom: (
      <VStack alignment="leading" spacing={2}>
        {sessionName}
        {folder}
        {since}
      </VStack>
    ),
  }
}

export const SessionActivity = createLiveActivity<LiveStatusProps>(LIVE_ACTIVITY_NAME, SessionActivityLayout)
