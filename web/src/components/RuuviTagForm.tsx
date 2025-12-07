import { Tag } from '@/types';

interface RuuviTagFormProps {
    tag: Tag;
    tagName: string;
    enabled: boolean;
    onNameChange: (name: string) => void;
    onEnabledChange: (enabled: boolean) => void;
}

export function RuuviTagForm({ tag, tagName, enabled, onNameChange, onEnabledChange }: RuuviTagFormProps) {
    const inputClasses = "w-full px-3 py-2 bg-ruuvi-dark border border-ruuvi-text-muted/20 rounded-lg focus:ring-2 focus:ring-ruuvi-success/50 focus:border-ruuvi-success text-sm text-white placeholder-ruuvi-text-muted/30";
    const labelClasses = "text-sm font-medium text-ruuvi-text-muted";

    return (
        <div className="space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-ruuvi-dark/30 border border-ruuvi-text-muted/10 rounded-lg">
                <div>
                    <div className="font-bold text-white">Enable Tag</div>
                    <div className="text-sm text-ruuvi-text-muted">Forward data from this tag to sinks</div>
                </div>
                <button
                    onClick={() => onEnabledChange(!enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-ruuvi-success' : 'bg-ruuvi-dark border border-ruuvi-text-muted/30'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* Name Field */}
            <div className="space-y-1">
                <label className={labelClasses}>Name</label>
                <input
                    type="text"
                    value={tagName}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="e.g., Living Room, Sauna, Outdoor"
                    className={inputClasses}
                />
                <p className="text-xs text-ruuvi-text-muted/70">Custom name for this tag (appears in MQTT payload)</p>
            </div>

            {/* Tag Information */}
            <div className="border-t border-ruuvi-dark/50 pt-4">
                <h4 className="text-sm font-bold text-white mb-3">Tag Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <div className="text-ruuvi-text-muted">MAC Address</div>
                        <div className="font-mono font-medium text-white">{tag.mac}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-ruuvi-text-muted">Data Format</div>
                        <div className="font-medium text-white">v{tag.data_format}</div>
                    </div>
                </div>
            </div>

            {/* Current Readings */}
            <div className="border-t border-ruuvi-dark/50 pt-4">
                <h4 className="text-sm font-bold text-white mb-3">Current Readings</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-ruuvi-dark/30 rounded-lg border border-ruuvi-text-muted/10">
                        <div className="text-ruuvi-text-muted text-xs uppercase tracking-wide">Temperature</div>
                        <div className="text-xl font-bold text-white">
                            {tag.temperature?.toFixed(2) ?? '--'} <span className="text-sm font-normal text-ruuvi-text-muted">°C</span>
                        </div>
                    </div>
                    <div className="p-3 bg-ruuvi-dark/30 rounded-lg border border-ruuvi-text-muted/10">
                        <div className="text-ruuvi-text-muted text-xs uppercase tracking-wide">Humidity</div>
                        <div className="text-xl font-bold text-white">
                            {tag.humidity?.toFixed(2) ?? '--'} <span className="text-sm font-normal text-ruuvi-text-muted">%</span>
                        </div>
                    </div>
                    <div className="p-3 bg-ruuvi-dark/30 rounded-lg border border-ruuvi-text-muted/10">
                        <div className="text-ruuvi-text-muted text-xs uppercase tracking-wide">Pressure</div>
                        <div className="text-xl font-bold text-white">
                            {tag.pressure ? (tag.pressure / 100).toFixed(1) : '--'} <span className="text-sm font-normal text-ruuvi-text-muted">hPa</span>
                        </div>
                    </div>
                    <div className="p-3 bg-ruuvi-dark/30 rounded-lg border border-ruuvi-text-muted/10">
                        <div className="text-ruuvi-text-muted text-xs uppercase tracking-wide">Battery</div>
                        <div className="text-xl font-bold text-white">
                            {tag.battery_voltage ? (tag.battery_voltage / 1000).toFixed(2) : '--'} <span className="text-sm font-normal text-ruuvi-text-muted">V</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Details */}
            <div className="border-t border-ruuvi-dark/50 pt-4">
                <h4 className="text-sm font-bold text-white mb-3">Diagnostics</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                        <div className="text-ruuvi-text-muted">Signal (RSSI)</div>
                        <div className="font-medium text-white">{tag.rssi} dBm</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-ruuvi-text-muted">TX Power</div>
                        <div className="font-medium text-white">{tag.tx_power ?? '--'} dBm</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-ruuvi-text-muted">Movement</div>
                        <div className="font-medium text-white">{tag.movement_counter ?? '--'}</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-ruuvi-text-muted">Sequence #</div>
                        <div className="font-medium text-white">{tag.measurement_sequence_number ?? '--'}</div>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <div className="text-ruuvi-text-muted">Last Seen</div>
                        <div className="font-medium text-white">
                            {new Date(tag.last_seen * 1000).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
