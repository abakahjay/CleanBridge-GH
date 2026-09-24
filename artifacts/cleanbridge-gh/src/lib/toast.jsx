import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

const ToastContext = createContext({ toast: () => {} });

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback((message, tone = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
  }, [dismiss]);

  const value = useMemo(() => ({ toast }), [toast]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map(({ id, message, tone }) => {
        const Icon = ICONS[tone] || Info;
        return <div key={id} className={`toast toast-${tone}`} data-testid="toast-message">
          <Icon size={16} />
          <span>{message}</span>
          <button className="toast-close" onClick={() => dismiss(id)} aria-label="Dismiss"><X size={14} /></button>
        </div>;
      })}
    </div>
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext).toast;
