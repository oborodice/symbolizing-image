import './style.css'
import { isDebugMode } from './debug'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  ${isDebugMode ? '<h1>DEBUG MODE</h1>' : ''}
`
