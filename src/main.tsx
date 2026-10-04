import { render } from 'preact';
import { init, installDebug } from './app/controller';
import { setUpdater, showUpdate } from './app/prefs';
import { registerSW } from './app/sw-register';
import { App } from './ui/App';
import './ui/styles.css';

installDebug();
render(<App />, document.getElementById('app') as HTMLElement);
void init();
// the offline worker: when a new version has downloaded, offer it quietly (never during a fight)
setUpdater(registerSW(() => (showUpdate.value = true)));
