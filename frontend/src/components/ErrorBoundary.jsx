import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Nexora UI ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{
          padding: '32px 24px',
          textAlign: 'center',
          borderLeft: '4px solid var(--status-error)',
          margin: '20px auto',
          maxWidth: '600px'
        }}>
          <div style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--status-error)' }}>⚠</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-h)', fontSize: '16px' }}>
            Component Display Interrupted
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {this.props.componentName
              ? `An unexpected error occurred while rendering the ${this.props.componentName} component.`
              : 'An unexpected display error occurred in this section.'}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            ↻ Retry Loading Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
