import type { TerminalComponent, TerminalTitleState } from '../../types';
import { createTerminalComponent } from '../component';

export function createTerminalTitle(config: {
  state: TerminalTitleState;
}): TerminalComponent<TerminalTitleState> {
  return createTerminalComponent<TerminalTitleState>({
    state: config.state,
    render({ state }) {
      if (state) {
        return (
          [
            '-'.repeat(process.stdout.columns),
            '---- ' + state.text,
            '-'.repeat(process.stdout.columns),
          ].join('\n') + '\n\n'
        );
      }
      return '';
    },
  });
}
