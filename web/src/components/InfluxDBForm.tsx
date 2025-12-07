import { InfluxDBPublisherConfig } from '@/types';

interface InfluxDBFormProps {
    initialConfig?: InfluxDBPublisherConfig;
    onChange: (config: InfluxDBPublisherConfig) => void;
}

export function InfluxDBForm({ initialConfig, onChange }: InfluxDBFormProps) {
    const defaultConfig: InfluxDBPublisherConfig = {
        enabled: true,
        url: 'http://localhost:8086',
        auth_token: '',
        org: 'my-org',
        bucket: 'ruuvi',
        measurement: 'ruuvi_measurements',
        minimum_interval: '1s'
    };

    const config = initialConfig || defaultConfig;

    const handleChange = (field: keyof InfluxDBPublisherConfig, value: any) => {
        onChange({ ...config, [field]: value });
    };

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
                <label htmlFor="enabled" className="text-sm font-bold text-white cursor-pointer select-none">Enable InfluxDB Publisher</label>
            </div>

            <div className="space-y-1">
                <label className={labelClasses}>URL</label>
                <input
                    type="text"
                    value={config.url}
                    onChange={(e) => handleChange('url', e.target.value)}
                    placeholder="http://localhost:8086"
                    className={inputClasses}
                />
            </div>

            <div className="space-y-1">
                <label className={labelClasses}>Auth Token</label>
                <input
                    type="password"
                    value={config.auth_token}
                    onChange={(e) => handleChange('auth_token', e.target.value)}
                    className={inputClasses}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className={labelClasses}>Organization</label>
                    <input
                        type="text"
                        value={config.org}
                        onChange={(e) => handleChange('org', e.target.value)}
                        className={inputClasses}
                    />
                </div>
                <div className="space-y-1">
                    <label className={labelClasses}>Bucket</label>
                    <input
                        type="text"
                        value={config.bucket}
                        onChange={(e) => handleChange('bucket', e.target.value)}
                        className={inputClasses}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className={labelClasses}>Measurement</label>
                    <input
                        type="text"
                        value={config.measurement}
                        onChange={(e) => handleChange('measurement', e.target.value)}
                        placeholder="ruuvi_measurements"
                        className={inputClasses}
                    />
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
            </div>
        </div>
    );
}
