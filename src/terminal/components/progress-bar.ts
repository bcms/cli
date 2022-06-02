import type { TerminalComponent, TerminalProgressBarState } from '../../types';
import { createTerminalComponent } from '../component';

export function createTerminalProgressBar(config: {
  state: TerminalProgressBarState;
}): TerminalComponent<TerminalProgressBarState> {
  function getBar(lng: number, char: string): string {
    let output = '';
    for (let i = 0; i < lng; i++) {
      output += char;
    }
    return output;
  }
  return createTerminalComponent<TerminalProgressBarState>({
    state: config.state,
    render({ state }) {
      if (state) {
        const barLength = process.stdout.columns - state.name.length - 15;
        let fillLength = (barLength / 100) * state.progress;
        if (fillLength > barLength) {
          fillLength = barLength;
        }
        const emptyLength = barLength - fillLength;
        return `${state.name}: [${getBar(fillLength, '#')}${getBar(
          emptyLength,
          ' ',
        )}] | ${state.progress.toFixed(2)}%`;
      }
      return '';
    },
  });
}
