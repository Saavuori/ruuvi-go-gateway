import { MQTTPublisherConfig } from '@/types';

interface MQTTFormProps {
    initialConfig?: MQTTPublisherConfig;
    onChange: (config: MQTTPublisherConfig) => void;
}

export function MQTTForm({ initialConfig, onChange }: MQTTFormProps) {
    const defaultConfig: MQTTPublisherConfig = {
        enabled: true,
        broker_url: 'tcp://localhost:1883',
        topic_prefix: 'ruuvi_measurements',
        client_id: 'ruuvi-bridge',
        minimum_interval: '1s',
        username: '',
        password: '',
        homeassistant_discovery_prefix: 'homeassistant',
        retain_messages: true,
    };

    const config = initialConfig || defaultConfig;

    const handleChange = (field: keyof MQTTPublisherConfig, value: any) => {
        onChange({ ...config, [field]: value });
    };

    // Common input styles for dark theme
    const inputClasses = "w-full px-3 py-2 bg-ruuvi-dark border border-ruuvi-text-muted/20 rounded-lg focus:ring-2 focus:ring-ruuvi-success/50 focus:border-ruuvi-success text-sm text-white placeholder-ruuvi-text-muted/30";
    const labelClasses = "text-sm font-medium text-ruuvi-text-muted";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-ruuvi-dark/30 rounded-lg border border-ruuvi-text-muted/10">
                <input
                    type="checkbox"
                    id="enabled"
                    checked={config.enabled}
                    onChange={(e) => handleChange('enabled', e.target.checked)}
                    className="w-4 h-4 text-ruuvi-success rounded border-ruuvi-text-muted/30 focus:ring-ruuvi-success bg-ruuvi-dark"
                />
                <label htmlFor="enabled" className="text-sm font-bold text-white cursor-pointer select-none">Enable MQTT Publisher</label>
            </div>

            <div className="space-y-1">
                <label className={labelClasses}>Broker URL</label>
                <input
                    type="text"
                    value={config.broker_url}
                    onChange={(e) => handleChange('broker_url', e.target.value)}
                    placeholder="tcp://localhost:1883"
                    className={inputClasses}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className={labelClasses}>Client ID</label>
                    <input
                        type="text"
                        value={config.client_id}
                        onChange={(e) => handleChange('client_id', e.target.value)}
                        className={inputClasses}
                    />
                </div>
                <div className="space-y-1">
                    <label className={labelClasses}>Topic Prefix</label>
                    <input
                        type="text"
                        value={config.topic_prefix}
                        onChange={(e) => handleChange('topic_prefix', e.target.value)}
                        className={inputClasses}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className={labelClasses}>Username</label>
                    <input
                        type="text"
                        value={config.username || ''}
                        onChange={(e) => handleChange('username', e.target.value)}
                        className={inputClasses}
                    />
                </div>
                <div className="space-y-1">
                    <label className={labelClasses}>Password</label>
                    <input
                        type="password"
                        value={config.password || ''}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className={inputClasses}
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className={labelClasses}>Minimum Interval</label>
                <input
                    type="text"
                    value={config.minimum_interval}
                    onChange={(e) => handleChange('minimum_interval', e.target.value)}
                    placeholder="1s"
                    className={inputClasses}
                />
                <p className="text-xs text-ruuvi-text-muted/70">e.g., 1s, 500ms</p>
            </div>

            <div className="space-y-1">
                <label className={labelClasses}>Home Assistant Discovery Prefix</label>
                <input
                    type="text"
                    value={config.homeassistant_discovery_prefix || ''}
                    onChange={(e) => handleChange('homeassistant_discovery_prefix', e.target.value)}
                    placeholder="homeassistant (leave empty to disable)"
                    className={inputClasses}
                />
            </div>

            <div className="flex items-center gap-3 pt-2">
                <input
                    type="checkbox"
                    id="retain"
                    checked={config.retain_messages !== false} // Default to true if undefined
                    onChange={(e) => handleChange('retain_messages', e.target.checked)}
                    className="w-4 h-4 text-ruuvi-success rounded border-ruuvi-text-muted/30 focus:ring-ruuvi-success bg-ruuvi-dark"
                />
                <label htmlFor="retain" className="text-sm font-medium text-ruuvi-text-muted cursor-pointer select-none">Retain Messages (Recommended)</label>
            </div>
        </div>
    );
}
