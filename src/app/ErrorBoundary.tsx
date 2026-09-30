import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    // No customer details or configuration values are written to the console.
    console.error('Die Ansicht konnte nicht geladen werden.', error.name);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <main role="alert">
          <h1>Die Ansicht konnte nicht geladen werden.</h1>
          <p>Bitte laden Sie die Seite erneut.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
