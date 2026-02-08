import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fix: Extending React.Component ensures the TypeScript compiler correctly identifies inherited properties like 'this.props' and 'this.state'.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare state and props members to satisfy the TypeScript compiler's type checking on the class instance.
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  // Fix: Initializing state in the constructor. The base class React.Component provides the type definitions for this.state and this.props.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Fix: Explicitly initializing the state object as required by the React class component lifecycle.
    this.state = { 
      hasError: false, 
      error: null 
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Fix: Accessing 'this.state' which is correctly typed by React.Component inheritance and explicit declaration.
    if (this.state.hasError) {
      return (
        <div style={{padding: '2rem', fontFamily: 'Tajawal, sans-serif', direction: 'rtl', textAlign: 'center', backgroundColor: '#FEF2F2', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h1 style={{fontSize: '2rem', color: '#991B1B', marginBottom: '1rem'}}>عذراً، حدث خطأ غير متوقع.</h1>
          <p style={{color: '#7F1D1D', marginBottom: '2rem'}}>يرجى تحديث الصفحة. إذا استمرت المشكلة، يرجى نسخ تفاصيل الخطأ أدناه.</p>
          <div style={{background: '#FFF', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #FECACA', direction: 'ltr', textAlign: 'left', maxWidth: '800px', overflow: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
            <code style={{color: '#DC2626', fontSize: '0.9rem'}}>{this.state.error?.toString()}</code>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{marginTop: '2rem', padding: '0.75rem 2rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold'}}
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }
    // Fix: Accessing 'this.props' which is correctly typed by React.Component inheritance and explicit declaration.
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);