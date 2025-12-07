'use client';

import { useEffect, useState } from 'react';
import { fetchConfig, fetchTags, updateConfig, enableTag, restartGateway, setTagName } from '@/lib/api';
import { Config, Tag, MQTTPublisherConfig, InfluxDBPublisherConfig, InfluxDB3PublisherConfig, MatterConfig } from '@/types';
import { IntegrationCard } from '@/components/IntegrationCard';
import { Modal } from '@/components/Modal';
import { MQTTForm } from '@/components/MQTTForm';
import { InfluxDBForm } from '@/components/InfluxDBForm';
import { InfluxDB3Form } from '@/components/InfluxDB3Form';
import { MatterForm } from '@/components/MatterForm';
import { RuuviTagForm } from '@/components/RuuviTagForm';
import { Bluetooth, Radio, Cloud, Database, BarChart3, Settings, Plus, Check, RefreshCw, QrCode } from 'lucide-react';

export default function Home() {
  const [config, setConfig] = useState<Config | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSinkId, setActiveSinkId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  // Restart Confirmation State
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [configChanged, setConfigChanged] = useState(false);

  // Tag Modal State
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tagModalName, setTagModalName] = useState('');
  const [tagModalEnabled, setTagModalEnabled] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configData, tagsData] = await Promise.all([
          fetchConfig(),
          fetchTags()
        ]);
        setConfig(configData);
        setTags(tagsData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(async () => {
      try {
        const tagsData = await fetchTags();
        setTags(tagsData);
      } catch (error) {
        console.error('Error polling tags:', error);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    if (!config || !activeSinkId) return;
    setIsSaving(true);

    try {
      // ... (config construction remains same)
      const newConfig = { ...config };

      if (activeSinkId === 'mqtt_publisher') {
        newConfig.mqtt_publisher = formData as MQTTPublisherConfig;
      } else if (activeSinkId === 'influxdb_publisher') {
        newConfig.influxdb_publisher = formData as InfluxDBPublisherConfig;
      } else if (activeSinkId === 'influxdb3_publisher') {
        newConfig.influxdb3_publisher = formData as InfluxDB3PublisherConfig;
      } else if (activeSinkId === 'matter') {
        newConfig.matter = formData as MatterConfig;
      }

      await updateConfig(newConfig);
      setConfig(newConfig);
      setIsModalOpen(false);
      setConfigChanged(true); // Mark config as changed
      setShowRestartPrompt(false); // Do not auto-show prompt, just show button
    } catch (e) {
      alert('Failed to save config: ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = async () => {
    if (!confirm('Are you sure you want to restart the gateway?')) return;

    setIsRestarting(true);
    try {
      await restartGateway();
      // Wait a bit to allow restart to trigger
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (e) {
      alert('Failed to restart: ' + e);
      setIsRestarting(false);
    }
  };

  const saveTagSettings = async () => {
    setIsSaving(true);
    try {
      if (!selectedTag || !config) return;
      let changed = false;
      const nameResult = await setTagName(selectedTag.mac, tagModalName);
      if (nameResult.success) {
        setConfig({ ...config, tag_names: nameResult.tag_names });
        changed = true;
      }
      const enableResult = await enableTag(selectedTag.mac, tagModalEnabled);
      if (enableResult.success) {
        setConfig(prev => prev ? { ...prev, enabled_tags: enableResult.enabled_tags } : null);
        changed = true;
      }
      if (changed) setConfigChanged(true);
      setSelectedTag(null);
    } catch (e) {
      alert('Failed to save: ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions
  const getTagName = (mac: string) => {
    return config?.tag_names?.[mac];
  };

  const isTagEnabled = (mac: string) => {
    // If enabled_tags is empty/undefined, defaults might differ, but usually it implies none or all? 
    // Based on handleTagEnable (api.go), it adds to the list. 
    // If the list is nil in config, it might mean "allow interaction" or "none enabled".
    // Let's assume explicit allowlist if the array exists. 
    // But typical behavior (allowlisting) means if the list is present, only those are enabled.
    // If config.enabled_tags is undefined, maybe all are enabled? 
    // Let's stick effectively to: is it in the list?
    return config?.enabled_tags?.some(m => m.toLowerCase() === mac.toLowerCase()) ?? false;
  };

  const openTagModal = (tag: Tag) => {
    setSelectedTag(tag);
    setTagModalName(getTagName(tag.mac) || '');
    setTagModalEnabled(isTagEnabled(tag.mac));
  };

  const handleConfigure = (id: string) => {
    setActiveSinkId(id);
    if (!config) return;

    if (id === 'mqtt_publisher') {
      setFormData(config.mqtt_publisher || {
        enabled: false,
        broker_url: 'tcp://localhost:1883',
        client_id: 'ruuvi-gateway',
        topic_prefix: 'ruuvi',
        send_decoded: true,
        minimum_interval: '1s'
      });
    } else if (id === 'influxdb_publisher') {
      setFormData(config.influxdb_publisher || {
        enabled: false,
        url: 'http://localhost:8086',
        auth_token: '',
        org: 'my-org',
        bucket: 'ruuvi',
        measurement: 'ruuvi_measurements',
        minimum_interval: '1s'
      });
    } else if (id === 'influxdb3_publisher') {
      setFormData(config.influxdb3_publisher || {
        enabled: false,
        url: 'https://us-east-1-1.aws.cloud2.influxdata.com',
        auth_token: '',
        database: 'ruuvi',
        measurement: 'ruuvi_measurements',
        minimum_interval: '1s'
      });
    } else if (id === 'matter') {
      setFormData(config.matter || {
        enabled: false,
        passcode: 20202021,
        discriminator: 3840,
        vendor_id: 65521,
        product_id: 32768,
        storage_path: "./matter_data"
      });
    } else if (id === 'prometheus') {
      // Prometheus usually just has enabled/disabled in this simple config, 
      // but let's check the schema. It has port and prefix.
      // For now, we don't have a form for it in the modal (based on lines 216-220), 
      // it just shows a message. But we set ID so the modal opens.
    }
    setIsModalOpen(true);
  };

  const sinks = [
    {
      id: 'mqtt_publisher',
      title: 'MQTT Publisher',
      desc: 'Publish tag data to MQTT broker',
      icon: Cloud,
      enabled: config?.mqtt_publisher?.enabled ?? false
    },
    {
      id: 'influxdb_publisher',
      title: 'InfluxDB v2',
      desc: 'Write data to InfluxDB v2',
      icon: Database,
      enabled: config?.influxdb_publisher?.enabled ?? false
    },
    {
      id: 'influxdb3_publisher',
      title: 'InfluxDB v3',
      desc: 'Write data to InfluxDB Cloud / v3',
      icon: Database,
      enabled: config?.influxdb3_publisher?.enabled ?? false
    },
    {
      id: 'prometheus',
      title: 'Prometheus',
      desc: 'Expose metrics for scraping',
      icon: BarChart3,
      enabled: config?.prometheus?.enabled ?? false
    },
    {
      id: 'matter',
      title: 'Matter Bridge',
      desc: 'Expose tags to Apple/Google Home',
      icon: QrCode,
      enabled: config?.matter?.enabled ?? false
    }
  ];

  return (
    <div className="min-h-screen bg-ruuvi-dark text-ruuvi-text">
      {/* Header */}
      <header className="bg-ruuvi-card border-b border-ruuvi-dark/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-ruuvi-success" />
            <h1 className="text-xl font-bold text-white">Ruuvi Gateway Management</h1>
          </div>
          <div className="flex items-center gap-4">
            {configChanged && (
              <button
                onClick={() => setShowRestartPrompt(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-ruuvi-dark bg-ruuvi-accent hover:bg-ruuvi-accent/90 rounded-lg transition-all animate-pulse shadow-glow"
              >
                <RefreshCw className="w-4 h-4" />
                Restart to Apply Changes
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Discovered Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">Discovered</h2>
            <p className="text-ruuvi-text-muted mt-1">Nearby RuuviTags detected by the scanner</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tags
              .sort((a, b) => a.mac.localeCompare(b.mac))
              .map((tag) => (
                <IntegrationCard
                  key={tag.mac}
                  title={getTagName(tag.mac) || `RuuviTag ${tag.mac.slice(-5)}`}
                  subtitle={tag.mac}
                  description="" // Not used when sensors are provided
                  icon={Bluetooth}
                  status={isTagEnabled(tag.mac) ? 'active' : 'new'}
                  sensors={{
                    temperature: tag.temperature,
                    humidity: tag.humidity,
                    pressure: tag.pressure,
                    voltage: tag.battery_voltage,
                    rssi: tag.rssi,
                    pm2p5: tag.pm2p5,
                    co2: tag.co2,
                    voc: tag.voc,
                    nox: tag.nox,
                    illuminance: tag.illuminance,
                    sound_average: tag.sound_average,
                    movement_counter: tag.movement_counter,
                    air_quality_index: tag.air_quality_index
                  }}
                  onConfigure={() => openTagModal(tag)}
                  configureLabel="Configure"
                  lastSeen={tag.last_seen}
                />
              ))}
            {tags.length === 0 && (
              <div className="col-span-full py-12 text-center text-ruuvi-text-muted bg-ruuvi-card/50 rounded-xl border border-dashed border-ruuvi-text-muted/20">
                No tags discovered yet.
              </div>
            )}
          </div>
        </section>

        {/* Configured Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">Configured</h2>
            <p className="text-ruuvi-text-muted mt-1">Active data sinks and integrations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sinks.map((sink) => (
              <IntegrationCard
                key={sink.id}
                title={sink.title}
                description={sink.desc}
                icon={sink.icon}
                status={sink.enabled ? 'active' : 'inactive'}
                onConfigure={() => handleConfigure(sink.id)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Config Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          activeSinkId === 'mqtt_publisher' ? 'Configure MQTT Publisher' :
            activeSinkId === 'influxdb_publisher' ? 'Configure InfluxDB Publisher' :
              activeSinkId === 'influxdb3_publisher' ? 'Configure InfluxDB v3 Publisher' :
                activeSinkId === 'matter' ? 'Matter Bridge Calibration' :
                  'Configure Integration'
        }
        onSubmit={handleSave}
        isSaving={isSaving}
      >
        {activeSinkId === 'mqtt_publisher' && (
          <MQTTForm
            initialConfig={formData}
            onChange={setFormData}
          />
        )}
        {activeSinkId === 'influxdb_publisher' && (
          <InfluxDBForm
            initialConfig={formData}
            onChange={setFormData}
          />
        )}
        {activeSinkId === 'influxdb3_publisher' && (
          <InfluxDB3Form
            initialConfig={formData}
            onChange={setFormData}
          />
        )}
        {activeSinkId === 'prometheus' && (
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
            To enable Prometheus scraping, set <code>enabled: true</code> in your configuration. The metrics will be available at <code>/metrics</code>.
          </div>
        )}
        {activeSinkId === 'matter' && (
          <MatterForm
            config={formData}
            onChange={setFormData}
          />
        )}
      </Modal>

      {/* Restart Confirmation Dialog */}
      {showRestartPrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-ruuvi-card border border-ruuvi-text-muted/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Restart Required</h3>
            <p className="text-ruuvi-text-muted mb-6">
              Configuration changes have been saved. The gateway needs to restart for changes to take effect.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRestartPrompt(false)}
                className="px-4 py-2 text-sm font-medium text-ruuvi-text-muted hover:text-white hover:bg-ruuvi-dark/50 rounded-lg transition-colors border border-transparent hover:border-ruuvi-text-muted/30"
                disabled={isRestarting}
              >
                Later
              </button>
              <button
                onClick={handleRestart}
                disabled={isRestarting}
                className="px-4 py-2 text-sm font-bold text-ruuvi-dark bg-ruuvi-success hover:bg-ruuvi-success/90 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRestarting ? 'Restarting...' : 'Restart Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Editing Modal */}
      <Modal
        isOpen={!!selectedTag}
        onClose={() => setSelectedTag(null)}
        title={getTagName(selectedTag?.mac || '') || `RuuviTag ${selectedTag?.mac?.slice(-5) || ''}`}
        onSubmit={saveTagSettings}
        isSaving={isSaving}
      >
        {selectedTag && (
          <RuuviTagForm
            tag={selectedTag}
            tagName={tagModalName}
            enabled={tagModalEnabled}
            onNameChange={setTagModalName}
            onEnabledChange={setTagModalEnabled}
          />
        )}
      </Modal>
    </div>
  );
}
