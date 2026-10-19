import { ScrollView } from 'react-native'
import { makeStyles, radius, space } from '@/core/theme'
import { Text } from '@/ui'

/** The report exactly as it will leave the phone. */
export function ReportPreview({ text, maxHeight = 260 }: { text: string; maxHeight?: number }) {
  const styles = useStyles()
  return (
    <ScrollView style={[styles.block, { maxHeight }]} nestedScrollEnabled>
      <ScrollView horizontal nestedScrollEnabled>
        <Text size="xs" color="textMuted" selectable>
          {text}
        </Text>
      </ScrollView>
    </ScrollView>
  )
}

const useStyles = makeStyles((theme) => ({
  block: {
    backgroundColor: theme.colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: space.sm,
  },
}))
