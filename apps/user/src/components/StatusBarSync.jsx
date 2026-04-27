import { useStatusBarColor } from '../hooks/useStatusBarColor'

export default function StatusBarSync({ screen = 'feed', theme }) {
  useStatusBarColor(theme || screen)
  return null
}
