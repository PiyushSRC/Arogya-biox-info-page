import React from 'react'
import ReactDOM from 'react-dom/client'
import DemoApp from './DemoApp'
import ErrorBoundary from '../components/ErrorBoundary'
import '../index.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
    throw new Error('Could not find root element to mount to')
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <ErrorBoundary>
            <DemoApp />
        </ErrorBoundary>
    </React.StrictMode>,
)
