import { LOCALE_NAMES, LOCALES } from '@remote-harness/protocol'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Switch, View } from 'react-native'
import { space, useTheme } from '@/core/theme'
import { Button, Card, Text } from '@/ui'
import type { VoiceLanguage } from '../language'
import { restoreVoiceInteraction, setPushToTalk, useVoiceInteractionStore } from '../voice-interaction-store'
import { restoreVoiceLanguage, setVoiceLanguage, useVoiceLanguageStore } from '../voice-language-store'
import { restoreVoicePolish, setVoicePolish, useVoicePolishStore } from '../voice-polish-store'

const OPTIONS: VoiceLanguage[] = ['app', ...LOCALES]

/** Settings → Voice: transcription language, "Polish dictation" and "Press and hold to record". */
export function VoiceLanguageCard() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const language = useVoiceLanguageStore((s) => s.language)
  const polishEnabled = useVoicePolishStore((s) => s.enabled)
  const pushToTalk = useVoiceInteractionStore((s) => s.pushToTalk)

  useEffect(() => {
    void restoreVoiceLanguage()
    void restoreVoicePolish()
    void restoreVoiceInteraction()
  }, [])

  return (
    <Card>
      <View style={styles.gap}>
        <Text weight="bold">{t('voice.languageTitle')}</Text>
        <Text size="sm" color="textMuted">
          {t('voice.languageHint')}
        </Text>
        <View style={styles.chips}>
          {OPTIONS.map((option) => (
            <Button
              key={option}
              label={option === 'app' ? t('voice.languageApp') : LOCALE_NAMES[option]}
              compact
              variant={language === option ? 'primary' : 'secondary'}
              onPress={() => void setVoiceLanguage(option)}
            />
          ))}
        </View>
        <ToggleRow
          title={t('voice.polishTitle')}
          hint={t('voice.polishHint')}
          value={polishEnabled}
          onValueChange={(value) => void setVoicePolish(value)}
          trackColor={colors}
        />
        <ToggleRow
          title={t('voice.pushToTalkTitle')}
          hint={t('voice.pushToTalkHint')}
          value={pushToTalk}
          onValueChange={(value) => void setPushToTalk(value)}
          trackColor={colors}
        />
      </View>
    </Card>
  )
}

function ToggleRow({
  title,
  hint,
  value,
  onValueChange,
  trackColor,
}: {
  title: string
  hint: string
  value: boolean
  onValueChange: (value: boolean) => void
  trackColor: { accent: string; borderStrong: string }
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text size="sm">{title}</Text>
        <Text size="xs" color="textMuted">
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={title}
        trackColor={{ true: trackColor.accent, false: trackColor.borderStrong }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: 2 },
})
