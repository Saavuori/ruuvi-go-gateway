import { Config, Tag } from '../types';

const MOCK_CONFIG: Config = {
    gw_mac: "00:00:00:00:00:00",
    all_advertisements: false,
    hci_index: 0,
    use_mock: true,
    mqtt: {
        enabled: false,
        broker_url: "tcp://localhost:1883",
        client_id: "ruuvi-gateway",
        topic_prefix: "ruuvi",
        send_decoded: false,
    },
    mqtt_publisher: {
        enabled: true,
        broker_url: "tcp://localhost:1883",
        client_id: "ruuvi-bridge",
        topic_prefix: "ruuvi_measurements",
        minimum_interval: "1s",
        homeassistant_discovery_prefix: "homeassistant",
    },
    influxdb_publisher: {
        enabled: false,
        url: "http://localhost:8086",
        auth_token: "token",
        org: "org",
        bucket: "bucket",
        measurement: "measurements",
        minimum_interval: "1s",
    },
};

const MOCK_TAGS: Tag[] = [
    {
        mac: "AA:BB:CC:DD:EE:FF",
        rssi: -70,
        data_format: 5,
        temperature: 24.5,
        humidity: 45.0,
        pressure: 1013.25,
        battery_voltage: 2.9,
        last_seen: Date.now(),
    },
    {
        mac: "11:22:33:44:55:66",
        rssi: -85,
        data_format: 5,
        temperature: 80.0,
        humidity: 20.0,
        pressure: 1000.00,
        battery_voltage: 3.0,
        last_seen: Date.now() - 5000,
    },
];

const IS_DEV = process.env.NODE_ENV === 'development';

export async function fetchConfig(): Promise<Config> {
    if (IS_DEV) return MOCK_CONFIG;
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
}

export async function updateConfig(config: Config): Promise<void> {
    if (IS_DEV) {
        console.log("Mock update config:", config);
        return;
    }
    const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update config');
}

export async function fetchTags(): Promise<Tag[]> {
    if (IS_DEV) return MOCK_TAGS;
    const res = await fetch('/api/tags');
    if (!res.ok) throw new Error('Failed to fetch tags');
    return res.json();
}

export async function enableTag(mac: string, enabled: boolean): Promise<{ success: boolean; enabled_tags: string[] }> {
    if (IS_DEV) {
        console.log("Mock enable tag:", mac, enabled);
        return { success: true, enabled_tags: [mac] };
    }
    const res = await fetch('/api/tags/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, enabled }),
    });
    if (!res.ok) throw new Error('Failed to enable tag');
    return res.json();
}

export async function restartGateway(): Promise<{ restarting: boolean }> {
    if (IS_DEV) {
        console.log("Mock restart gateway");
        return { restarting: true };
    }
    const res = await fetch('/api/restart', {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to restart gateway');
    return res.json();
}

export async function setTagName(mac: string, name: string): Promise<{ success: boolean; tag_names: Record<string, string> }> {
    if (IS_DEV) {
        console.log("Mock set tag name:", mac, name);
        return { success: true, tag_names: { [mac]: name } };
    }
    const res = await fetch('/api/tags/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, name }),
    });
    if (!res.ok) throw new Error('Failed to set tag name');
    return res.json();
}

export async function fetchMatterStatus(): Promise<{ pairing_code: string; qr_code: string }> {
    if (IS_DEV) return { pairing_code: "20202021", qr_code: "MT:Y.K9042C00KA0648G00" };
    const res = await fetch('/api/matter');
    if (!res.ok) throw new Error('Failed to fetch matter status');
    return res.json();
}
