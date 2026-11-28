import { render } from '@solidjs/web'

import { App } from './App'
import './styles.css'
import './styles.mobile.css'
import './styles.docs.css'
import './examples/examples.css'

const root = document.getElementById('app')
if (root) {
  render(() => <App />, root)
}
