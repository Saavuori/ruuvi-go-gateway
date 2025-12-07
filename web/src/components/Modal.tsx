import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    onSubmit: () => void;
    isSaving?: boolean;
}

export function Modal({ isOpen, onClose, title, children, onSubmit, isSaving }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-ruuvi-card border border-ruuvi-text-muted/10 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-ruuvi-dark/50">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 text-ruuvi-text-muted hover:text-white rounded-lg hover:bg-ruuvi-dark/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {children}
                </div>

                <div className="p-6 bg-ruuvi-dark/30 flex justify-end gap-3 border-t border-ruuvi-dark/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-ruuvi-text-muted bg-transparent border border-ruuvi-text-muted/30 rounded-lg hover:bg-ruuvi-dark/50 hover:text-white focus:ring-2 focus:ring-ruuvi-text-muted/50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-bold text-ruuvi-dark bg-ruuvi-success rounded-lg hover:bg-ruuvi-success/90 focus:ring-2 focus:ring-ruuvi-success/50 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
