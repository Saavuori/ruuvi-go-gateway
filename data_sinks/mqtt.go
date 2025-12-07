package data_sinks

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/Saavuori/ruuvi-go-gateway/common/limiter"
	"github.com/Saavuori/ruuvi-go-gateway/config"
	"github.com/Saavuori/ruuvi-go-gateway/parser"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	log "github.com/sirupsen/logrus"
)

// normalizeBrokerURL ensures the broker URL has the tcp:// scheme and :1883 port
func normalizeBrokerURL(url string) string {
	if url == "" {
		return "tcp://localhost:1883"
	}
	
	// Add tcp:// if no scheme present
	if !strings.Contains(url, "://") {
		url = "tcp://" + url
	}
	
	// Add :1883 if no port present (check after the scheme)
	parts := strings.SplitN(url, "://", 2)
	if len(parts) == 2 && !strings.Contains(parts[1], ":") {
		url = parts[0] + "://" + parts[1] + ":1883"
	}
	
	return url
}

func MQTT(conf config.MQTTPublisher, tagNames map[string]string) chan<- parser.Measurement {
	server := normalizeBrokerURL(conf.BrokerUrl)
	log.WithFields(log.Fields{
		"target":           server,
		"topic_prefix":     conf.TopicPrefix,
		"minimum_interval": conf.MinimumInterval,
	}).Info("Starting MQTT sink")

	clientID := conf.ClientID
	if clientID == "" {
		clientID = "RuuviBridgePublisher"
	}
	opts := mqtt.NewClientOptions()
	opts.SetCleanSession(false)
	opts.AddBroker(server)
	opts.SetClientID(clientID)
	opts.SetUsername(conf.Username)
	opts.SetPassword(conf.Password)
	opts.SetKeepAlive(10 * time.Second)
	opts.SetAutoReconnect(true)
	opts.SetMaxReconnectInterval(10 * time.Second)
	if conf.LWTTopic != "" {
		payload := conf.LWTOfflinePayload
		if payload == "" {
			payload = "{\"state\":\"offline\"}"
		}
		opts.SetWill(conf.LWTTopic, payload, 0, true)
	}
	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
			log.WithFields(log.Fields{
				"target":           server,
				"topic_prefix":     conf.TopicPrefix,
				"minimum_interval": conf.MinimumInterval,
			}).WithError(token.Error()).Error("Failed to connect to MQTT")
	}
	if conf.LWTTopic != "" {
		payload := conf.LWTOnlinePayload
		if payload == "" {
			payload = "{\"state\":\"online\"}"
		}
		client.Publish(conf.LWTTopic, 0, true, payload)
	}

	// Helper to get tag name from config
	getTagName := func(mac string) string {
		if tagNames != nil {
			if name, ok := tagNames[strings.ToUpper(mac)]; ok && name != "" {
				return name
			}
		}
		return ""
	}

	limiter := limiter.New(time.Duration(conf.MinimumInterval))
	measurements := make(chan parser.Measurement, 1024)
	go func() {
		for measurement := range measurements {
			if !limiter.Check(measurement) {
				log.WithField("mac", measurement.Mac).Trace("Skipping MQTT publish due to interval limit")
				continue
			}
			// Add tag name to measurement if configured
			if name := getTagName(measurement.Mac); name != "" {
				measurement.Name = &name
			}
			data, err := json.Marshal(measurement)
			if err != nil {
				log.WithError(err).Error("Failed to serialize measurement")
			} else {
				client.Publish(conf.TopicPrefix+"/"+measurement.Mac, 0, conf.RetainMessages, string(data))
				if conf.HomeassistantDiscoveryPrefix != "" {
					publishHomeAssistantDiscoveries(client, conf, measurement)
				}
				if conf.PublishRaw {
					safePublishF := func(label string, v *float64) {
						if v != nil {
							client.Publish(conf.TopicPrefix+"/"+measurement.Mac+"/"+label, 0, conf.RetainMessages, strconv.FormatFloat(*v, 'f', -1, 64))
						}
					}
					safePublishI := func(label string, v *int64) {
						if v != nil {
							client.Publish(conf.TopicPrefix+"/"+measurement.Mac+"/"+label, 0, conf.RetainMessages, strconv.FormatInt(*v, 10))
						}
					}
					safePublishB := func(label string, v *bool) {
						if v != nil {
							client.Publish(conf.TopicPrefix+"/"+measurement.Mac+"/"+label, 0, conf.RetainMessages, strconv.FormatBool(*v))
						}
					}
					safePublishF("temperature", measurement.Temperature)
					safePublishF("humidity", measurement.Humidity)
					safePublishF("pressure", measurement.Pressure)
					safePublishF("accelerationX", measurement.AccelerationX)
					safePublishF("accelerationY", measurement.AccelerationY)
					safePublishF("accelerationZ", measurement.AccelerationZ)
					safePublishF("batteryVoltage", measurement.BatteryVoltage)
					safePublishI("txPower", measurement.TxPower)
					safePublishI("rssi", measurement.Rssi)
					safePublishI("movementCounter", measurement.MovementCounter)
					safePublishI("measurementSequenceNumber", measurement.MeasurementSequenceNumber)
					safePublishF("accelerationTotal", measurement.AccelerationTotal)
					safePublishF("absoluteHumidity", measurement.AbsoluteHumidity)
					safePublishF("dewPoint", measurement.DewPoint)
					safePublishF("equilibriumVaporPressure", measurement.EquilibriumVaporPressure)
					safePublishF("airDensity", measurement.AirDensity)
					safePublishF("accelerationAngleFromX", measurement.AccelerationAngleFromX)
					safePublishF("accelerationAngleFromY", measurement.AccelerationAngleFromY)
					safePublishF("accelerationAngleFromZ", measurement.AccelerationAngleFromZ)
					// New E1 fields
					safePublishF("pm1p0", measurement.Pm1p0)
					safePublishF("pm2p5", measurement.Pm2p5)
					safePublishF("pm4p0", measurement.Pm4p0)
					safePublishF("pm10p0", measurement.Pm10p0)
					safePublishF("co2", measurement.CO2)
					safePublishF("voc", measurement.VOC)
					safePublishF("nox", measurement.NOX)
					safePublishF("illuminance", measurement.Illuminance)
					safePublishF("soundInstant", measurement.SoundInstant)
					safePublishF("soundAverage", measurement.SoundAverage)
					safePublishF("soundPeak", measurement.SoundPeak)
					safePublishF("airQualityIndex", measurement.AirQualityIndex)
					// Diagnostics
					safePublishB("calibrationInProgress", measurement.CalibrationInProgress)
					safePublishB("buttonPressedOnBoot", measurement.ButtonPressedOnBoot)
					safePublishB("rtcOnBoot", measurement.RtcOnBoot)
				}
			}
		}
	}()
	return measurements
}
