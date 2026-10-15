import { router } from 'expo-router'
import { ExternalLink, QrCode, Share2 } from 'lucide-react-native'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native'
import { colors, radius, space } from '@/core/theme'
import { Button, Card, Screen, Text } from '@/ui'
import { buildSetupGuide, type GuideAction, REPO_URL } from './setup-guide'

function runAction(action: GuideAction): void {
  if (action.kind === 'link') void Linking.openURL(action.url)
  else if (action.kind === 'share') void Share.share({ message: action.text })
  else router.back()
}

function actionIcon(action: GuideAction, color: string) {
  if (action.kind === 'link') return <ExternalLink size={16} color={color} />
  if (action.kind === 'share') return <Share2 size={16} color={color} />
  return <QrCode size={16} color={color} />
}

/** Step-by-step for people who installed the app before setting up Tailscale and the Mac. */
export function SetupGuideScreen() {
  const { t } = useTranslation()
  const guide = useMemo(() => buildSetupGuide(t), [t])
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text size="xl" weight="bold">
          <Text size="xl" weight="bold" color="accent">
            {'> '}
          </Text>
          {t('setupGuide.title')}
        </Text>
        <Text color="textMuted">{t('setupGuide.intro')}</Text>

        {guide.map((step, index) => {
          const last = index === guide.length - 1
          return (
            <Card key={step.id} accent={last ? colors.accent : undefined}>
              <View style={styles.step}>
                <View style={styles.header}>
                  <View style={styles.badge}>
                    <Text size="sm" weight="bold" color="background">
                      {index + 1}
                    </Text>
                  </View>
                  <Text weight="bold" style={styles.flex}>
                    {step.title}
                  </Text>
                </View>
                <Text color="textMuted">{step.body}</Text>
                {step.code ? (
                  <View style={styles.code}>
                    <Text size="sm" color="accent" selectable>
                      {`$ ${step.code}`}
                    </Text>
                  </View>
                ) : null}
                {step.actions.map((action) => {
                  const primary = action.kind === 'scan'
                  return (
                    <Button
                      key={action.label}
                      label={action.label}
                      variant={primary ? 'primary' : 'secondary'}
                      icon={actionIcon(action, primary ? colors.background : colors.text)}
                      onPress={() => runAction(action)}
                    />
                  )
                })}
              </View>
            </Card>
          )
        })}

        <Text size="sm" color="textDim" style={styles.footer}>
          {t('setupGuide.help', { url: REPO_URL })}
        </Text>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  step: { gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  code: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  footer: { textAlign: 'center' },
})
