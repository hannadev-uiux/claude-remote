import { useWindowDimensions } from 'react-native'
import { getWidthClass, type WidthClass } from './width-class'

export function useWidthClass(): WidthClass {
  const { width } = useWindowDimensions()
  return getWidthClass(width)
}
