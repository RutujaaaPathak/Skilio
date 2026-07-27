import { Component } from 'react';
import Icon from './Icon.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-gutter">
          <div className="max-w-md text-center">
            <Icon name="error_outline" className="text-6xl text-error mb-md" />
            <h1 className="text-headline-lg text-primary font-bold mb-sm">Something went wrong</h1>
            <p className="text-body-md text-on-surface-variant mb-md">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="h-12 px-xl bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
