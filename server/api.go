package server

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/Saavuori/ruuvi-go-gateway/config"
	"github.com/Saavuori/ruuvi-go-gateway/parser"
	"github.com/Saavuori/ruuvi-go-gateway/service/matter"
	"github.com/Saavuori/ruuvi-go-gateway/web"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

type Tag struct {
	Mac                       string   `json:"mac"`
	Rssi                      int64    `json:"rssi"`
	DataFormat                int64    `json:"data_format"`
	Temperature               *float64 `json:"temperature,omitempty"`
	Humidity                  *float64 `json:"humidity,omitempty"`
	Pressure                  *float64 `json:"pressure,omitempty"`
	BatteryVoltage            *float64 `json:"battery_voltage,omitempty"`
	TxPower                   *int64   `json:"tx_power,omitempty"`
	MovementCounter           *int64   `json:"movement_counter,omitempty"`
	MeasurementSequenceNumber *int64   `json:"measurement_sequence_number,omitempty"`
	// Extended fields for Format 6 / E1
	Pm1p0           *float64 `json:"pm1p0,omitempty"`
	Pm2p5           *float64 `json:"pm2p5,omitempty"`
	Pm4p0           *float64 `json:"pm4p0,omitempty"`
	Pm10p0          *float64 `json:"pm10p0,omitempty"`
	CO2             *float64 `json:"co2,omitempty"`
	VOC             *float64 `json:"voc,omitempty"`
	NOX             *float64 `json:"nox,omitempty"`
	Illuminance     *float64 `json:"illuminance,omitempty"`
	SoundInstant    *float64 `json:"sound_instant,omitempty"`
	SoundAverage    *float64 `json:"sound_average,omitempty"`
	SoundPeak       *float64 `json:"sound_peak,omitempty"`
	AirQualityIndex *float64 `json:"air_quality_index,omitempty"`
	LastSeen        int64    `json:"last_seen"` // Unix timestamp in ms
}

var (
	recentTags = make(map[string]Tag)
	tagsLock   sync.RWMutex
	configFile = "config.yml" // Default, can be overridden
)

func UpdateTag(m parser.Measurement) {
	tagsLock.Lock()
	defer tagsLock.Unlock()

	tags, ok := recentTags[m.Mac]
	if !ok {
		tags = Tag{Mac: m.Mac}
	}
	if m.AirQualityIndex != nil {
		tags.AirQualityIndex = m.AirQualityIndex
	}
	if m.Rssi != nil {
		tags.Rssi = *m.Rssi
	}
	tags.DataFormat = m.DataFormat
	tags.Temperature = m.Temperature
	tags.Humidity = m.Humidity
	tags.Pressure = m.Pressure
	tags.BatteryVoltage = m.BatteryVoltage
	tags.TxPower = m.TxPower
	tags.MovementCounter = m.MovementCounter
	tags.MeasurementSequenceNumber = m.MeasurementSequenceNumber

	// Map extended fields
	tags.Pm1p0 = m.Pm1p0
	tags.Pm2p5 = m.Pm2p5
	tags.Pm4p0 = m.Pm4p0
	tags.Pm10p0 = m.Pm10p0
	tags.CO2 = m.CO2
	tags.VOC = m.VOC
	tags.NOX = m.NOX
	tags.Illuminance = m.Illuminance
	tags.SoundInstant = m.SoundInstant
	tags.SoundAverage = m.SoundAverage
	tags.SoundPeak = m.SoundPeak

	tags.LastSeen = time.Now().UnixMilli()
	recentTags[m.Mac] = tags
}

func Start(conf config.Config, confFile string, matterBridge *matter.Bridge) {
	if confFile != "" {
		configFile = confFile
	}

	mux := http.NewServeMux()

	// API Endpoints
	mux.HandleFunc("/api/config", handleConfig)
	mux.HandleFunc("/api/tags", handleTags)
	mux.HandleFunc("/api/tags/enable", handleTagEnable)
	mux.HandleFunc("/api/tags/name", handleTagName)
	mux.HandleFunc("/api/restart", handleRestart)

	// Matter API
	mux.HandleFunc("/api/matter", func(w http.ResponseWriter, r *http.Request) {
		handleMatter(w, r, matterBridge)
	})

	// Static Files (Web UI)
	fsys, err := fs.Sub(web.Assets, "out")
	if err != nil {
		log.WithError(err).Error("Failed to load embedded web assets")
	} else {
		mux.Handle("/", http.FileServer(http.FS(fsys)))
	}

	port := 8080
	if conf.HTTPListener != nil && conf.HTTPListener.Port != 0 {
		port = conf.HTTPListener.Port
	}
	addr := fmt.Sprintf(":%d", port)
	log.WithField("addr", addr).Info("Starting Management Web UI")

	go func() {
		if err := http.ListenAndServe(addr, mux); err != nil {
			log.WithError(err).Error("Web UI server failed")
		}
	}()
}

func handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		// Read config file directly to return exactly what's on disk (including comments if we parse loosely, but here we just re-read)
		// Actually, standard json marshal of the struct is safer for the UI contract.
		// We'll read the file, unmarshal, and return JSON.
		data, err := os.ReadFile(configFile)
		if err != nil {
			http.Error(w, "Failed to read config", http.StatusInternalServerError)
			return
		}
		// Convert YAML to JSON for the frontend
		var c config.Config
		if err := yaml.Unmarshal(data, &c); err != nil {
			http.Error(w, "Failed to parse config", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(c)

	} else if r.Method == http.MethodPost {
		var newConfig config.Config
		if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
			log.WithError(err).Error("Failed to decode config JSON")
			http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Save back to YAML
		data, err := yaml.Marshal(newConfig)
		if err != nil {
			http.Error(w, "Failed to marshal config", http.StatusInternalServerError)
			return
		}

		if err := os.WriteFile(configFile, data, 0644); err != nil {
			http.Error(w, "Failed to write config file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		// NOTE: Does not automatically reload the gateway. Restart required.
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleTags(w http.ResponseWriter, r *http.Request) {
	tagsLock.RLock()
	defer tagsLock.RUnlock()

	list := make([]Tag, 0, len(recentTags))
	for _, t := range recentTags {
		list = append(list, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func handleTagEnable(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Mac     string `json:"mac"`
		Enabled bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	req.Mac = strings.ToUpper(req.Mac)

	// Read current config
	data, err := os.ReadFile(configFile)
	if err != nil {
		http.Error(w, "Failed to read config", http.StatusInternalServerError)
		return
	}
	var c config.Config
	if err := yaml.Unmarshal(data, &c); err != nil {
		http.Error(w, "Failed to parse config", http.StatusInternalServerError)
		return
	}

	// Update enabled tags
	if req.Enabled {
		// Add to list if not present
		found := false
		for _, mac := range c.EnabledTags {
			if strings.EqualFold(mac, req.Mac) {
				found = true
				break
			}
		}
		if !found {
			c.EnabledTags = append(c.EnabledTags, req.Mac)
		}
	} else {
		// Remove from list
		newList := make([]string, 0, len(c.EnabledTags))
		for _, mac := range c.EnabledTags {
			if !strings.EqualFold(mac, req.Mac) {
				newList = append(newList, mac)
			}
		}
		c.EnabledTags = newList
	}

	// Save back
	newData, err := yaml.Marshal(c)
	if err != nil {
		http.Error(w, "Failed to marshal config", http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(configFile, newData, 0644); err != nil {
		http.Error(w, "Failed to write config", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"enabled_tags": c.EnabledTags,
	})
}

func handleRestart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Info("Restart requested via API")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"restarting": true})

	// Exit gracefully after response is sent
	go func() {
		time.Sleep(500 * time.Millisecond)
		log.Info("Exiting for restart...")
		os.Exit(0)
	}()
}

func handleTagName(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Mac  string `json:"mac"`
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	req.Mac = strings.ToUpper(req.Mac)

	// Read current config
	data, err := os.ReadFile(configFile)
	if err != nil {
		http.Error(w, "Failed to read config", http.StatusInternalServerError)
		return
	}
	var c config.Config
	if err := yaml.Unmarshal(data, &c); err != nil {
		http.Error(w, "Failed to parse config", http.StatusInternalServerError)
		return
	}

	// Update tag names
	if c.TagNames == nil {
		c.TagNames = make(map[string]string)
	}

	if req.Name == "" {
		delete(c.TagNames, req.Mac)
	} else {
		c.TagNames[req.Mac] = req.Name
	}

	// Save back
	newData, err := yaml.Marshal(c)
	if err != nil {
		http.Error(w, "Failed to marshal config", http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(configFile, newData, 0644); err != nil {
		http.Error(w, "Failed to write config", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"tag_names": c.TagNames,
	})
}

func handleMatter(w http.ResponseWriter, r *http.Request, bridge *matter.Bridge) {
	if bridge == nil {
		http.Error(w, "Matter support not initialized", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"pairing_code": bridge.GetPairingCode(),
		"qr_code":      bridge.GetQRCode(),
	})
}
