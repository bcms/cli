import type {
  TerminalComponent,
  TerminalListState,
  TerminalListStateItem,
} from '../../types';
import { createTerminalComponent } from '../component';

export function createTerminalList(config: {
  state: TerminalListState;
}): TerminalComponent<TerminalListState> {
  function buildList(
    items: TerminalListStateItem[],
    indent: string,
    depth: number[],
  ): string {
    let output = '';
    for (let i = 0; i < items.length; i++) {
      depth[depth.length - 1] = i + 1;
      const item = items[i];
      output += `${indent}${depth.join('.')}. ${item.text}\n`;
      if (item.children) {
        depth.push(1);
        output += buildList(item.children, indent + '  ', depth);
        depth.pop();
      }
    }
    return output;
  }

  return createTerminalComponent<TerminalListState>({
    state: config.state,
    render({ state }) {
      if (state) {
        return buildList(state.items, '', [1]) + '\n';
      }
      return '';
    },
  });
}
