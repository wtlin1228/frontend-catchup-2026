import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// StrictMode on purpose: the survey wants to see the double-invoked effects that imperative pages trip over.
export function mount(element) {
  createRoot(document.getElementById('root')).render(<StrictMode>{element}</StrictMode>);
}
