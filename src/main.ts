import './style.css'
import { isDebugMode } from './debug/is-debug-mode'
import { renderDebugScreen } from './debug/screen'

const app = document.querySelector<HTMLDivElement>('#app')!

if (isDebugMode) {
  renderDebugScreen(app)
}
