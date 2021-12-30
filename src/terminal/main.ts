import type { TerminalComponent } from '../types';

export class Terminal {
  private static components: { [name: string]: TerminalComponent<unknown> } =
    {};

  static pushComponent(
    ...components: Array<{
      name: string;
      component: TerminalComponent<unknown>;
    }>
  ): void {
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      this.components[component.name] = component.component;
    }
  }

  static getComponent<State>(
    name: string,
  ): TerminalComponent<State> | undefined {
    return this.components[name] as TerminalComponent<State> | undefined;
  }

  static removeComponent(name: string): void {
    delete this.components[name];
  }

  static updateComponent<State>(name: string, state: State): void {
    if (this.components[name]) {
      this.components[name].update({ state });
      this.render();
    }
  }

  static render(): void {
    process.stdout.cursorTo(0, 0);
    process.stdout.clearScreenDown();
    for (const name in this.components) {
      const component = this.components[name];
      process.stdout.write(component.render());
    }
    process.stdout.write('\n');
  }
}
