import type { PermissionAnswer, Question } from '@claude-remote/protocol'
import { Check, MessageCircleQuestionMark } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { colors, fontSize, fonts, radius, space } from '@/core/theme'
import { Button, Text } from '@/ui'
import {
  buildAnswers,
  EMPTY_SELECTION,
  isAnswerComplete,
  type Selection,
  setOther,
  toggleOption,
} from '../interaction'

type Props = {
  questions: Question[]
  title: string | null
  busy: boolean
  onAnswer: (answer: PermissionAnswer) => void
  onDecline: () => void
}

/** `AskUserQuestion` as a native card: options, free-text "Other", Send and Decline. */
export function QuestionCard({ questions, title, busy, onAnswer, onDecline }: Props) {
  const { t } = useTranslation()
  const [selections, setSelections] = useState<Record<string, Selection>>({})
  const update = (question: string, change: (s: Selection) => Selection) =>
    setSelections((all) => ({ ...all, [question]: change(all[question] ?? EMPTY_SELECTION) }))

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MessageCircleQuestionMark size={16} color={colors.accent} />
        <Text weight="bold" color="accent" style={styles.flex} numberOfLines={2}>
          {title ?? t('permissions.question.title')}
        </Text>
      </View>
      <ScrollView style={styles.body} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {questions.map((q) => {
          const selection = selections[q.question] ?? EMPTY_SELECTION
          return (
            <View key={q.question} style={styles.question}>
              {q.header ? (
                <Text size="xs" color="textMuted">
                  {q.header}
                </Text>
              ) : null}
              <Text size="sm" weight="medium" selectable>
                {q.question}
              </Text>
              {q.multiSelect ? (
                <Text size="xs" color="textMuted">
                  {t('permissions.question.multi')}
                </Text>
              ) : null}
              {q.options.map((option) => {
                const picked = selection.picked.includes(option.label)
                return (
                  <Pressable
                    key={option.label}
                    accessibilityRole={q.multiSelect ? 'checkbox' : 'radio'}
                    accessibilityState={{ checked: picked }}
                    disabled={busy}
                    onPress={() => update(q.question, (s) => toggleOption(s, option.label, q.multiSelect))}
                    style={[styles.option, picked && styles.optionPicked]}
                  >
                    <View
                      style={[styles.mark, !q.multiSelect && styles.markRound, picked && styles.markPicked]}
                    >
                      {picked ? <Check size={12} color={colors.background} /> : null}
                    </View>
                    <View style={styles.flex}>
                      <Text size="sm">{option.label}</Text>
                      {option.description ? (
                        <Text size="xs" color="textMuted">
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                )
              })}
              <TextInput
                value={selection.other}
                onChangeText={(text) => update(q.question, (s) => setOther(s, text, q.multiSelect))}
                placeholder={t(
                  q.kind === 'choice' ? 'permissions.question.other' : 'permissions.question.answer',
                )}
                placeholderTextColor={colors.textMuted}
                keyboardType={q.kind === 'number' ? 'numeric' : 'default'}
                editable={!busy}
                multiline={q.kind === 'text'}
                style={styles.input}
              />
            </View>
          )
        })}
      </ScrollView>
      <View style={styles.actions}>
        <Button
          label={t('permissions.question.decline')}
          variant="danger"
          compact
          flex
          disabled={busy}
          onPress={onDecline}
        />
        <Button
          label={t('permissions.question.send')}
          variant="primary"
          compact
          flex
          loading={busy}
          disabled={!isAnswerComplete(questions, selections)}
          onPress={() => onAnswer({ kind: 'question', answers: buildAnswers(questions, selections) })}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    margin: space.sm,
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  body: { maxHeight: 360 },
  question: { gap: space.xs, paddingVertical: space.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionPicked: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  mark: {
    width: 18,
    height: 18,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markRound: { borderRadius: 9 },
  markPicked: { backgroundColor: colors.accent, borderColor: colors.accent },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.sm,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
})
