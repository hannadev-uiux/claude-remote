import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import { font, foregroundStyle, frame, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers'
import { LIVE_ACTIVITY_NAME, type LiveStatusProps } from '@remote-harness/protocol'
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets'

/**
 * Lock screen and Dynamic Island layout of a session's live status. It runs in the widget runtime:
 * only `@expo/ui/swift-ui`, no app state, no imports used inside, so the texts arrive translated in
 * the props and the colors are written inline (theme accent #D97757, success #7FB069, warning
 * #E5C07B, secondary #8A8784).
 */
function SessionActivityLayout(props: LiveStatusProps, environment: LiveActivityEnvironment) {
  'widget'
  const tint =
    props.state === 'waiting'
      ? '#E5C07B'
      : props.state === 'done'
        ? '#7FB069'
        : props.state === 'closed'
          ? '#8A8784'
          : '#D97757'
  const symbol =
    props.state === 'waiting'
      ? 'hand.raised.fill'
      : props.state === 'done'
        ? 'checkmark.circle.fill'
        : props.state === 'closed'
          ? 'xmark.circle.fill'
          : 'terminal.fill'
  const running = props.state === 'working' || props.state === 'waiting'
  const details = [props.step, props.tools].filter((part) => part.length > 0).join(' · ')
  const elapsed = (
    <Text
      date={new Date(props.startedAt)}
      dateStyle="timer"
      modifiers={[
        font({ size: 15, weight: 'semibold', design: 'monospaced' }),
        monospacedDigit(),
        foregroundStyle(tint),
      ]}
    />
  )
  const icon = <Image systemName={symbol} modifiers={[foregroundStyle(tint)]} />

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 16 })]}>
        <Image systemName={symbol} modifiers={[font({ size: 28 }), foregroundStyle(tint)]} />
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 13 }), foregroundStyle('#8A8784')]}>{props.title}</Text>
          <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(tint)]}>{props.status}</Text>
          {details ? (
            <Text modifiers={[font({ size: 13 }), foregroundStyle('#E8E6E3')]}>{details}</Text>
          ) : null}
        </VStack>
        <Spacer />
        {running ? elapsed : null}
      </HStack>
    ),
    compactLeading: icon,
    compactTrailing: running ? (
      <Text
        date={new Date(props.startedAt)}
        dateStyle="timer"
        modifiers={[monospacedDigit(), foregroundStyle(tint), frame({ maxWidth: 52 })]}
      />
    ) : (
      icon
    ),
    minimal: icon,
    expandedLeading: (
      <HStack spacing={6}>
        {icon}
        <Text modifiers={[font({ weight: 'semibold' })]}>{props.title}</Text>
      </HStack>
    ),
    expandedTrailing: running ? elapsed : null,
    expandedBottom: (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ weight: 'bold' }), foregroundStyle(tint)]}>{props.status}</Text>
        {details ? (
          <Text
            modifiers={[
              font({ size: 13 }),
              foregroundStyle(environment.colorScheme === 'light' ? '#5E5A56' : '#8A8784'),
            ]}
          >
            {details}
          </Text>
        ) : null}
      </VStack>
    ),
  }
}

export const SessionActivity = createLiveActivity<LiveStatusProps>(LIVE_ACTIVITY_NAME, SessionActivityLayout)
