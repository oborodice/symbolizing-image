import './style.css'
import { renderDebugScreen } from './debug/screen'

const app = document.querySelector<HTMLDivElement>('#app')!

renderDebugScreen(app)
