import { useWindowDimensions } from 'react-native'
import { getLayoutClass, getWidthClass, type LayoutClass, type WidthClass } from './width-class'

export function useWidthClass(): WidthClass {
  const { width } = useWindowDimensions()
  return getWidthClass(width)
}

/** Layout class of the window and whether it is taller than wide (tablet portrait). */
export function useLayout(): { layout: LayoutClass; portrait: boolean; width: number } {
  const { width, height } = useWindowDimensions()
  return { layout: getLayoutClass(width), portrait: height > width, width }
}
