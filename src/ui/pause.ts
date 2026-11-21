// The pause menu for local matches.
import { audio } from '../audio/audio';
import { h, uiRoot } from './dom';
import { controlsHelp } from './versus';

export function pauseMenu(resume: () => void, quit: () => void, practice = false): void {
  const el = h(
    'div.screen',
    { style: { background: 'rgba(10,4,18,0.7)', justifyContent: 'center' } },
    h(
      'div.panel.col',
      { style: { width: 'min(640px, 94vw)', alignItems: 'stretch' } },
      h('h2.center', 'PAUSED'),
      h('div.center.dim', 'Take a breather, bro. Hydrate.'),
      h('button.big.primary', { 'data-pad-start': true, onclick: () => done(resume) }, 'Resume'),
      h('button.big', { onclick: () => done(quit) }, practice ? 'Leave practice' : 'Quit match'),
      h('details', h('summary', { style: { cursor: 'pointer', fontWeight: '900' } }, 'Controls'), controlsHelp()),
    ),
  );
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') done(resume);
  };
  setTimeout(() => window.addEventListener('keydown', onKey), 50);
  uiRoot().appendChild(el);
  const done = (fn: () => void): void => {
    window.removeEventListener('keydown', onKey);
    el.remove();
    audio.sfx('back');
    fn();
  };
}
