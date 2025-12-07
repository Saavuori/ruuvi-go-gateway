'use client';

import { useEffect, useState } from 'react';
import { fetchConfig, fetchTags, updateConfig, enableTag, restartGateway, setTagName } from '@/lib/api';
import { Config, Tag, MQTTPublisherConfig, InfluxDBPublisherConfig, InfluxDB3PublisherConfig } from '@/types';
import { IntegrationCard } from '@/components/IntegrationCard';
import { Modal } from '@/components/Modal';
import { MQTTForm } from '@/components/MQTTForm';
import { InfluxDBForm } from '@/components/InfluxDBForm';
import { InfluxDB3Form } from '@/components/InfluxDB3Form';
import { RuuviTagForm } from '@/components/RuuviTagForm';
import { Bluetooth, Radio, Cloud, Database, BarChart3, Settings, Plus, Check, RefreshCw } from 'lucide-react';

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

  // Tag Modal State
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tagModalName, setTagModalName] = useState('');
  const [tagModalEnabled, setTagModalEnabled] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [cfg, t] = await Promise.all([fetchConfig(), fetchTags()]);
        setConfig(cfg);
        setTags(t);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();

    const interval = setInterval(async () => {
      try {
        const t = await fetchTags();
        setTags(t);
      } catch (e) {
        console.error("Failed to refresh tags", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleConfigure = (sinkId: string) => {
    if (!config) return;
    setActiveSinkId(sinkId);

    if (sinkId === 'mqtt_publisher') {
      setFormData(config.mqtt_publisher || { enabled: true });
    } else if (sinkId === 'influxdb_publisher') {
      setFormData(config.influxdb_publisher || { enabled: true });
    } else if (sinkId === 'influxdb3_publisher') {
      setFormData(config.influxdb3_publisher || { enabled: true });
    }

    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!config || !activeSinkId) return;
    setIsSaving(true);

    try {
      const newConfig = { ...config };

      if (activeSinkId === 'mqtt_publisher') {
        newConfig.mqtt_publisher = formData as MQTTPublisherConfig;
      } else if (activeSinkId === 'influxdb_publisher') {
        newConfig.influxdb_publisher = formData as InfluxDBPublisherConfig;
      } else if (activeSinkId === 'influxdb3_publisher') {
        newConfig.influxdb3_publisher = formData as InfluxDB3PublisherConfig;
      }

      await updateConfig(newConfig);
      setConfig(newConfig);
      setIsModalOpen(false);
      setShowRestartPrompt(true); // Show restart confirmation
    } catch (e) {
      alert('Failed to save config: ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await restartGateway();
      // Gateway will exit, page will become unresponsive
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      alert('Failed to restart: ' + e);
      setIsRestarting(false);
    }
  };

  const handleAddTag = async (mac: string) => {
    try {
      const result = await enableTag(mac, true);
      if (result.success && config) {
        setConfig({ ...config, enabled_tags: result.enabled_tags });
      }
    } catch (e) {
      alert('Failed to add tag: ' + e);
    }
  };

  const handleRemoveTag = async (mac: string) => {
    try {
      const result = await enableTag(mac, false);
      if (result.success && config) {
        setConfig({ ...config, enabled_tags: result.enabled_tags });
      }
    } catch (e) {
      alert('Failed to remove tag: ' + e);
    }
  };

  const isTagEnabled = (mac: string) => {
    return config?.enabled_tags?.some(m => m.toUpperCase() === mac.toUpperCase()) ?? false;
  };

  const getTagName = (mac: string) => {
    return config?.tag_names?.[mac.toUpperCase()] || config?.tag_names?.[mac] || null;
  };

  const openTagModal = (tag: Tag) => {
    setSelectedTag(tag);
    setTagModalName(getTagName(tag.mac) || '');
    setTagModalEnabled(isTagEnabled(tag.mac));
  };

  const saveTagSettings = async () => {
    if (!selectedTag || !config) return;
    setIsSaving(true);
    try {
      // Update name
      const nameResult = await setTagName(selectedTag.mac, tagModalName);
      if (nameResult.success) {
        setConfig({ ...config, tag_names: nameResult.tag_names });
      }
      // Update enabled status
      const enableResult = await enableTag(selectedTag.mac, tagModalEnabled);
      if (enableResult.success) {
        setConfig(prev => prev ? { ...prev, enabled_tags: enableResult.enabled_tags } : null);
      }
      setSelectedTag(null);
    } catch (e) {
      alert('Failed to save: ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Helper to map config sections to cards
  const sinks = [
    {
      id: 'mqtt_publisher',
      title: 'MQTT Publisher',
      desc: 'Publish JSON to MQTT Broker',
      icon: Radio,
      enabled: config.mqtt_publisher?.enabled,
    },
    {
      id: 'influxdb_publisher',
      title: 'InfluxDB v2',
      desc: 'Send data to InfluxDB Time Series',
      icon: Database,
      enabled: config.influxdb_publisher?.enabled,
    },
    {
      id: 'influxdb3_publisher',
      title: 'InfluxDB v3',
      desc: 'Send data to InfluxDB Cloud',
      icon: Cloud,
      enabled: config.influxdb3_publisher?.enabled,
    },
    {
      id: 'prometheus',
      title: 'Prometheus',
      desc: 'Expose metrics for scraping',
      icon: BarChart3,
      enabled: config.prometheus?.enabled,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Ruuvi Gateway Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRestartPrompt(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Restart Gateway
            </button>
            <span className="text-sm text-gray-500">v{process.env.NEXT_PUBLIC_VERSION || 'DEV'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Discovered Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Discovered</h2>
            <p className="text-gray-500 mt-1">Nearby RuuviTags detected by the scanner</p>
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
                    movement_counter: tag.movement_counter
                  }}
                  onConfigure={() => openTagModal(tag)}
                  configureLabel="Configure"
                />
              ))}
            {tags.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                No tags discovered yet.
              </div>
            )}
          </div>
        </section>

        {/* Configured Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Configured</h2>
            <p className="text-gray-500 mt-1">Active data sinks and integrations</p>
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
      </Modal>

      {/* Restart Confirmation Dialog */}
      {showRestartPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Restart Required</h3>
            <p className="text-gray-600 mb-6">
              Configuration changes have been saved. The gateway needs to restart for changes to take effect.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRestartPrompt(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isRestarting}
              >
                Later
              </button>
              <button
                onClick={handleRestart}
                disabled={isRestarting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
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
