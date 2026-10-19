import type { PermissionAnswer, PlanDecision } from '@remote-harness/protocol'
import { ClipboardList } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, TextInput, View } from 'react-native'
import { fontSize, fonts, makeStyles, radius, space, useTheme } from '@/core/theme'
import { Button, Text } from '@/ui'
import { Markdown } from '../../conversation/components/Markdown'

type Props = {
  plan: string | null
  busy: boolean
  onAnswer: (answer: PermissionAnswer) => void
}

/** `ExitPlanMode` as a card: the plan, two ways to approve, and "keep planning" with feedback. */
export function PlanCard({ plan, busy, onAnswer }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const [planning, setPlanning] = useState(false)
  const [feedback, setFeedback] = useState('')
  const decide = (decision: PlanDecision) =>
    onAnswer({ kind: 'plan', decision, ...(decision === 'keepPlanning' ? { feedback } : {}) })

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ClipboardList size={16} color={colors.accentText} />
        <Text weight="bold" color="accentText" style={styles.flex}>
          {t('permissions.plan.title')}
        </Text>
      </View>
      <ScrollView style={styles.plan} nestedScrollEnabled>
        {plan ? (
          <Markdown text={plan} />
        ) : (
          <Text size="sm" color="textMuted">
            {t('permissions.plan.empty')}
          </Text>
        )}
      </ScrollView>
      {planning ? (
        <>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder={t('permissions.plan.feedback')}
            placeholderTextColor={colors.textMuted}
            editable={!busy}
            multiline
            autoFocus
            style={styles.input}
          />
          <View style={styles.actions}>
            <Button
              label={t('permissions.plan.cancel')}
              variant="ghost"
              compact
              flex
              disabled={busy}
              onPress={() => setPlanning(false)}
            />
            <Button
              label={t('permissions.plan.keepPlanning')}
              variant="primary"
              compact
              flex
              loading={busy}
              onPress={() => decide('keepPlanning')}
            />
          </View>
        </>
      ) : (
        <View style={styles.column}>
          <Button
            label={t('permissions.plan.acceptEdits')}
            variant="success"
            compact
            loading={busy}
            onPress={() => decide('acceptEdits')}
          />
          <Button
            label={t('permissions.plan.reviewEdits')}
            compact
            disabled={busy}
            onPress={() => decide('default')}
          />
          <Button
            label={t('permissions.plan.keepPlanning')}
            variant="ghost"
            compact
            disabled={busy}
            onPress={() => setPlanning(true)}
          />
        </View>
      )}
    </View>
  )
}

const useStyles = makeStyles((theme) => ({
  card: {
    margin: space.sm,
    padding: space.md,
    gap: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  plan: {
    maxHeight: 280,
    backgroundColor: theme.colors.background,
    borderRadius: radius.sm,
    padding: space.sm,
  },
  input: {
    minHeight: 64,
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.sm,
    color: theme.colors.text,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    textAlignVertical: 'top',
  },
  column: { gap: space.sm, marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
}))
