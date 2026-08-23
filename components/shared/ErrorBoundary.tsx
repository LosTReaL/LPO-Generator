import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f8fafc',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: 'white',
            padding: '2.5rem',
            borderRadius: '1rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            maxWidth: '28rem',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: '#ef4444' }}>
              <AlertTriangle size={48} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem', lineHeight: 1.5 }}>
              The application encountered an unexpected error. You can try refreshing the page or returning to the home screen.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#4338ca')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#4f46e5')}
            >
              <RotateCcw size={18} /> Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
