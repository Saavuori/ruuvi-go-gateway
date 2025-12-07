package gateway

import (
	"context"
	"fmt"
	"strings"

	"github.com/Saavuori/ruuvi-go-gateway/config"
	"github.com/Saavuori/ruuvi-go-gateway/data_sinks"
	"github.com/Saavuori/ruuvi-go-gateway/parser"
	"github.com/Saavuori/ruuvi-go-gateway/server"
	"github.com/Saavuori/ruuvi-go-gateway/value_calculator"
	"github.com/rigado/ble"
	log "github.com/sirupsen/logrus"
)

func Run(config config.Config, configPath string) {
	// Start Management Web UI
	server.Start(config, configPath)

	gwMac := config.GwMac
	if gwMac == "" {
		gwMac = "00:00:00:00:00:00"
	}
	
	// New Sinks Setup (Legacy MQTT/HTTP senders have been removed)
	var sinks []chan<- parser.Measurement
	if config.MQTTPublisher != nil && (config.MQTTPublisher.Enabled == nil || *config.MQTTPublisher.Enabled) {
		sinks = append(sinks, data_sinks.MQTT(*config.MQTTPublisher, config.TagNames))
	}
	if config.InfluxDBPublisher != nil && (config.InfluxDBPublisher.Enabled == nil || *config.InfluxDBPublisher.Enabled) {
		sinks = append(sinks, data_sinks.InfluxDB(*config.InfluxDBPublisher))
	}
	if config.InfluxDB3Publisher != nil && (config.InfluxDB3Publisher.Enabled == nil || *config.InfluxDB3Publisher.Enabled) {
		sinks = append(sinks, data_sinks.InfluxDB3(*config.InfluxDB3Publisher))
	}
	if config.Prometheus != nil && (config.Prometheus.Enabled == nil || *config.Prometheus.Enabled) {
		sinks = append(sinks, data_sinks.Prometheus(*config.Prometheus))
	}

	if len(sinks) == 0 {
		log.Warn("No sinks configured. Configure via Web UI.")
	}

	advHandler := func(adv ble.Advertisement) {
		data := adv.ManufacturerData()
		if len(data) > 2 {
			isRuuvi := data[0] == 0x99 && data[1] == 0x04 // ruuvi company identifier
			
			// Reconstruct raw packet for parser
			// Flags (020106) + Length of ManData (1 byte) + Type (FF) + ManData (ID + Payload)
			// ManData = data
			rawInput := fmt.Sprintf("020106%02XFF%X", len(data)+1, data)
			
			log.WithFields(log.Fields{
				"mac":      strings.ToUpper(adv.Addr().String()),
				"rssi":     adv.RSSI(),
				"is_ruuvi": isRuuvi,
				"data":     fmt.Sprintf("%X", data),
			}).Trace("Received data from BLE adapter")

			if config.AllAdvertisements || isRuuvi {
				// Parse measurement (always needed for Web UI)
				measurement, ok := parser.Parse(rawInput)
				if ok {
					measurement.Mac = strings.ToUpper(adv.Addr().String())
					measurement.Rssi = i64(int64(adv.RSSI()))
					
					// Name priority: Config > Advertisement > Default
					if name, ok := config.TagNames[measurement.Mac]; ok {
						measurement.Name = &name
					} else if adv.LocalName() != "" {
						n := adv.LocalName()
						measurement.Name = &n
					}

					value_calculator.CalcExtendedValues(&measurement)
					
					// Update Web UI Cache (always, for discovery)
					server.UpdateTag(measurement)

					// Send to sinks only if tag is enabled (or if no allowlist is set)
					tagEnabled := len(config.EnabledTags) == 0 // If no allowlist, send all
					for _, mac := range config.EnabledTags {
						if strings.EqualFold(mac, measurement.Mac) {
							tagEnabled = true
							break
						}
					}
					
					if tagEnabled {
						for _, sink := range sinks {
							select {
							case sink <- measurement:
							default:
							}
						}
					}
				}
			}
		}
	}

	if config.UseMock {
		MockScan(advHandler)
		return
	}

	device, err := newDevice(config)
	if err != nil {
		log.Fatal(err)
	}
	ble.SetDefaultDevice(device)

	err = ble.Scan(context.Background(), true, advHandler, nil)
	if err != nil {
		log.WithError(err).Error("Failed to scan")
	}
}

func i64(v int64) *int64 { return &v }
