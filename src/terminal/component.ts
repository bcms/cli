import type { TerminalComponent, TerminalComponentConfig } from '../types';

export function createTerminalComponent<State>(
  data: TerminalComponentConfig<State>,
): TerminalComponent<State> {
  const self: TerminalComponent<State> = {
    text: '',
    state: data.state,
    render() {
      self.text = data.render({ state: self.state });
      return self.text;
    },
    size() {
      const lines = self.text.split('\n');
      let longestLine = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length > longestLine) {
          longestLine = line.length;
        }
      }
      return [longestLine, lines.length];
    },
    update(input) {
      if (input && input.state) {
        self.state = input.state;
      }
      if (data.onUpdate) {
        data.onUpdate(self);
      }
    },
  };

  return self;
}
