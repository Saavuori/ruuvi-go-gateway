import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchMatterStatus } from '@/lib/api';
import { MatterConfig } from '@/types';
import { RefreshCw, Copy, Check } from 'lucide-react';

interface MatterFormProps {
    config?: MatterConfig;
    onChange: (config: MatterConfig) => void;
}

export function MatterForm({ config, onChange }: MatterFormProps) {
    const [pairingCode, setPairingCode] = useState<string>('');
    const [qrPayload, setQrPayload] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const loadStatus = async () => {
            try {
                const status = await fetchMatterStatus();
                setPairingCode(status.pairing_code);
                setQrPayload(status.qr_code);
            } catch (err) {
                setError('Failed to load Matter status. Ensure the gateway is running.');
            } finally {
                setLoading(false);
            }
        };

        if (config?.enabled) {
            loadStatus();
        } else {
            setLoading(false);
        }
    }, [config?.enabled]);

    const handleCopy = () => {
        navigator.clipboard.writeText(pairingCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!config) return null;

    return (
        <div className="space-y-6">
            <div className="bg-ruuvi-dark/30 rounded-lg p-4 mb-4 border border-ruuvi-text-muted/10">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="matter_enabled"
                        checked={config.enabled}
                        onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
                        className="w-5 h-5 text-ruuvi-success bg-ruuvi-dark border-ruuvi-text-muted/30 rounded focus:ring-ruuvi-success focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                    />
                    <label htmlFor="matter_enabled" className="text-white font-medium cursor-pointer">
                        Enable Matter Bridge
                    </label>
                </div>
                <p className="text-sm text-ruuvi-text-muted mt-2 ml-8">
                    Exposes discovered RuuviTags as Matter devices (Temperature, Humidity, Pressure sensors).
                </p>
            </div>

            {config.enabled && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <RefreshCw className="w-8 h-8 text-ruuvi-accent animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-200 text-sm">
                            {error}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-6 shadow-xl w-full max-w-sm mx-auto">
                            <div className="bg-white p-2 rounded-lg">
                                <QRCodeSVG
                                    value={qrPayload}
                                    size={200}
                                    level="M"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="w-full text-center space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                                    Manual Pairing Code
                                </label>
                                <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg p-3 group relative cursor-pointer" onClick={handleCopy}>
                                    <span className="font-mono text-2xl font-bold text-gray-800 tracking-widest">
                                        {pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode}
                                    </span>
                                    <button
                                        className="absolute right-2 text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Copy to clipboard"
                                    >
                                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Scan with your Google Home or Apple Home app to pair.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="border-t border-ruuvi-text-muted/10 pt-4">
                        <h4 className="text-sm font-bold text-white mb-3">Advanced Settings</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-ruuvi-text-muted mb-1">Passcode</label>
                                <input
                                    type="number"
                                    value={config.passcode}
                                    onChange={(e) => onChange({ ...config, passcode: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-ruuvi-dark border border-ruuvi-text-muted/20 rounded px-3 py-2 text-white text-sm focus:border-ruuvi-success focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-ruuvi-text-muted mb-1">Discriminator</label>
                                <input
                                    type="number"
                                    value={config.discriminator}
                                    onChange={(e) => onChange({ ...config, discriminator: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-ruuvi-dark border border-ruuvi-text-muted/20 rounded px-3 py-2 text-white text-sm focus:border-ruuvi-success focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
