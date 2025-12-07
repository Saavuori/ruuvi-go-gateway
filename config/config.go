package config

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Duration time.Duration

func (d *Duration) UnmarshalJSON(b []byte) error {
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	switch value := v.(type) {
	case float64:
		*d = Duration(time.Duration(value))
		return nil
	case string:
		tmp, err := time.ParseDuration(value)
		if err != nil {
			return err
		}
		*d = Duration(tmp)
		return nil
	default:
		return errors.New("invalid duration")
	}
}

func (d Duration) MarshalJSON() ([]byte, error) {
	return json.Marshal(time.Duration(d).String())
}

func (d *Duration) UnmarshalYAML(value *yaml.Node) error {
	var tmp time.Duration
	if err := value.Decode(&tmp); err != nil {
		return err
	}
	*d = Duration(tmp)
	return nil
}

func (d Duration) MarshalYAML() (interface{}, error) {
	return time.Duration(d).String(), nil
}

type Logging struct {
	Type       string `yaml:"type" json:"type"`
	Level      string `yaml:"level" json:"level"`
	Timestamps *bool  `yaml:"timestamps,omitempty" json:"timestamps,omitempty"`
	WithCaller bool   `yaml:"with_caller,omitempty" json:"with_caller,omitempty"`
}

type Config struct {
	GwMac             string `yaml:"gw_mac" json:"gw_mac"`
	AllAdvertisements bool   `yaml:"all_advertisements" json:"all_advertisements"`
	HciIndex          int    `yaml:"hci_index" json:"hci_index"`
	UseMock           bool   `yaml:"use_mock" json:"use_mock"`

	GatewayPolling     *GatewayPolling     `yaml:"gateway_polling,omitempty" json:"gateway_polling,omitempty"`
	MQTTListener       *MQTTListener       `yaml:"mqtt_listener,omitempty" json:"mqtt_listener,omitempty"`
	HTTPListener       *HTTPListener       `yaml:"http_listener,omitempty" json:"http_listener,omitempty"`
	Processing         *Processing         `yaml:"processing,omitempty" json:"processing,omitempty"`
	InfluxDBPublisher  *InfluxDBPublisher  `yaml:"influxdb_publisher,omitempty" json:"influxdb_publisher,omitempty"`
	InfluxDB3Publisher *InfluxDB3Publisher `yaml:"influxdb3_publisher,omitempty" json:"influxdb3_publisher,omitempty"`
	Prometheus         *Prometheus         `yaml:"prometheus,omitempty" json:"prometheus,omitempty"`
	MQTTPublisher      *MQTTPublisher      `yaml:"mqtt_publisher,omitempty" json:"mqtt_publisher,omitempty"`
	Matter             *Matter             `yaml:"matter,omitempty" json:"matter,omitempty"`
	TagNames           map[string]string   `yaml:"tag_names,omitempty" json:"tag_names,omitempty"`
	EnabledTags        []string            `yaml:"enabled_tags,omitempty" json:"enabled_tags,omitempty"`
	Logging            Logging             `yaml:"logging" json:"logging"`
	Debug              bool                `yaml:"debug" json:"debug"`
}

type GatewayPolling struct {
	Enabled     *bool    `yaml:"enabled,omitempty"`
	GatewayUrl  string   `yaml:"gateway_url"`
	BearerToken string   `yaml:"bearer_token"`
	Interval    Duration `yaml:"interval"`
}

type MQTTListener struct {
	Enabled           *bool  `yaml:"enabled,omitempty"`
	BrokerUrl         string `yaml:"broker_url"`
	BrokerAddress     string `yaml:"broker_address"`
	BrokerPort        int    `yaml:"broker_port"`
	ClientID          string `yaml:"client_id"`
	Username          string `yaml:"username"`
	Password          string `yaml:"password"`
	TopicPrefix       string `yaml:"topic_prefix"`
	LWTTopic          string `yaml:"lwt_topic"`
	LWTOnlinePayload  string `yaml:"lwt_online_payload"`
	LWTOfflinePayload string `yaml:"lwt_offline_payload"`
}

type HTTPListener struct {
	Enabled *bool `yaml:"enabled,omitempty"`
	Port    int   `yaml:"port"`
}

type Processing struct {
	ExtendedValues    *bool    `yaml:"extended_values,omitempty"`
	FilterMode        string   `yaml:"filter_mode"`
	FilterList        []string `yaml:"filter_list"`
	DisableFormats    []string `yaml:"disable_formats"`
	IncludeUnofficial bool     `yaml:"include_unofficial"`
}

type InfluxDBPublisher struct {
	Enabled         *bool             `yaml:"enabled,omitempty" json:"enabled,omitempty"`
	MinimumInterval Duration          `yaml:"minimum_interval,omitempty" json:"minimum_interval,omitempty"`
	Url             string            `yaml:"url" json:"url"`
	AuthToken       string            `yaml:"auth_token" json:"auth_token"`
	Org             string            `yaml:"org" json:"org"`
	Bucket          string            `yaml:"bucket" json:"bucket"`
	Measurement     string            `yaml:"measurement" json:"measurement"`
	AdditionalTags  map[string]string `yaml:"additional_tags,omitempty" json:"additional_tags,omitempty"`
}

type InfluxDB3Publisher struct {
	Enabled         *bool             `yaml:"enabled,omitempty" json:"enabled,omitempty"`
	MinimumInterval Duration          `yaml:"minimum_interval,omitempty" json:"minimum_interval,omitempty"`
	Url             string            `yaml:"url" json:"url"`
	AuthToken       string            `yaml:"auth_token" json:"auth_token"`
	Database        string            `yaml:"database" json:"database"`
	Measurement     string            `yaml:"measurement" json:"measurement"`
	AdditionalTags  map[string]string `yaml:"additional_tags,omitempty" json:"additional_tags,omitempty"`
}

type Prometheus struct {
	Enabled                 *bool  `yaml:"enabled,omitempty"`
	Port                    int    `yaml:"port"`
	MeasurementMetricPrefix string `yaml:"measurement_metric_prefix"`
}

type MQTTPublisher struct {
	Enabled                      *bool    `yaml:"enabled,omitempty" json:"enabled,omitempty"`
	MinimumInterval              Duration `yaml:"minimum_interval,omitempty" json:"minimum_interval,omitempty"`
	BrokerUrl                    string   `yaml:"broker_url" json:"broker_url"`
	BrokerAddress                string   `yaml:"broker_address" json:"broker_address"`
	BrokerPort                   int      `yaml:"broker_port" json:"broker_port"`
	ClientID                     string   `yaml:"client_id" json:"client_id"`
	Username                     string   `yaml:"username" json:"username"`
	Password                     string   `yaml:"password" json:"password"`
	TopicPrefix                  string   `yaml:"topic_prefix" json:"topic_prefix"`
	PublishRaw                   bool     `yaml:"publish_raw" json:"publish_raw"`
	RetainMessages               bool     `yaml:"retain_messages" json:"retain_messages"`
	HomeassistantDiscoveryPrefix string   `yaml:"homeassistant_discovery_prefix,omitempty" json:"homeassistant_discovery_prefix,omitempty"`
	LWTTopic                     string   `yaml:"lwt_topic" json:"lwt_topic"`
	LWTOnlinePayload             string   `yaml:"lwt_online_payload" json:"lwt_online_payload"`
	LWTOfflinePayload            string   `yaml:"lwt_offline_payload" json:"lwt_offline_payload"`
}

type Matter struct {
	Enabled       *bool  `yaml:"enabled,omitempty" json:"enabled,omitempty"`
	Passcode      uint32 `yaml:"passcode" json:"passcode"`
	Discriminator uint16 `yaml:"discriminator" json:"discriminator"`
	VendorID      uint16 `yaml:"vendor_id" json:"vendor_id"`
	ProductID     uint16 `yaml:"product_id" json:"product_id"`
	StoragePath   string `yaml:"storage_path" json:"storage_path"`
}

func ReadConfig(configFile string, strict bool) (Config, error) {
	if _, err := os.Stat(configFile); errors.Is(err, os.ErrNotExist) {
		return Config{}, fmt.Errorf("no config found! Tried to open \"%s\"", configFile)
	}

	f, err := os.Open(configFile)
	if err != nil {
		return Config{}, err
	}
	defer f.Close()

	var conf Config
	decoder := yaml.NewDecoder(f)
	decoder.KnownFields(strict)
	err = decoder.Decode(&conf)

	if err != nil {
		return Config{}, err
	}
	return conf, nil
}
