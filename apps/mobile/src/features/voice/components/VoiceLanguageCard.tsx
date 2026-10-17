import { LOCALE_NAMES, LOCALES } from '@remote-harness/protocol'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { space } from '@/core/theme'
import { Button, Card, Text } from '@/ui'
import type { VoiceLanguage } from '../language'
import { restoreVoiceLanguage, setVoiceLanguage, useVoiceLanguageStore } from '../voice-language-store'

const OPTIONS: VoiceLanguage[] = ['app', ...LOCALES]

/** "Same as the app" (default) or a fixed language for voice dictation, independent of the app's own UI language. */
export function VoiceLanguageCard() {
  const { t } = useTranslation()
  const language = useVoiceLanguageStore((s) => s.language)

  useEffect(() => {
    void restoreVoiceLanguage()
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
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  gap: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
})
