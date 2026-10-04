import { render } from 'preact';
import { init, installDebug } from './app/controller';
import { App } from './ui/App';
import './ui/styles.css';

installDebug();
render(<App />, document.getElementById('app') as HTMLElement);
void init();
