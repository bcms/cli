export interface TerminalComponentConfig<State> {
  state?: State;
  onUpdate?(self: TerminalComponent<State>): void;
  render(data: { state?: State }): string;
}

export interface TerminalComponent<State> {
  text: string;
  state?: State;
  update(data?: { state?: State }): void;
  render(): string;
  size(): [number, number];
}
