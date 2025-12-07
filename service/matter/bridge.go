package matter

import (
	"fmt"
	"sync"
	"time"

	"github.com/Saavuori/ruuvi-go-gateway/config"
	"github.com/Saavuori/ruuvi-go-gateway/parser"
	log "github.com/sirupsen/logrus"
)

type Bridge struct {
	config    *config.Matter
	endpoints map[string]bool // Map MAC -> Exists
	mu        sync.RWMutex
	startTime time.Time
}

func New(conf *config.Matter) *Bridge {
	return &Bridge{
		config:    conf,
		endpoints: make(map[string]bool),
	}
}

func (b *Bridge) Start() error {
	if b.config == nil || b.config.Enabled == nil || !*b.config.Enabled {
		return nil
	}

	b.startTime = time.Now()
	log.Info("Starting Matter Bridge service (Stub Implementation)")
	log.Info("Matter support is currently a placeholder. Full protocol support requires a C++ SDK integration or a mature Go library.")

	return nil
}

func (b *Bridge) UpdateTag(m parser.Measurement) {
	if b.config == nil || b.config.Enabled == nil || !*b.config.Enabled {
		return
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	// Check if endpoint exists
	if _, exists := b.endpoints[m.Mac]; !exists {
		b.createEndpoint(m)
	}

	// Update endpoint values
	b.updateEndpoint(m)
}

func (b *Bridge) createEndpoint(m parser.Measurement) {
	log.WithField("mac", m.Mac).Info("Matter Bridge: Discovered new RuuviTag, creating virtual endpoint")
	b.endpoints[m.Mac] = true
}

func (b *Bridge) updateEndpoint(m parser.Measurement) {
	// In a real implementation, this would update the Matter cluster attributes.
	// log.WithField("mac", m.Mac).Trace("Matter Bridge: Updating tag values")
}

func (b *Bridge) GetPairingCode() string {
	if b.config == nil {
		return ""
	}
	return fmt.Sprintf("%d", b.config.Passcode)
}

func (b *Bridge) GetQRCode() string {
	// Returns a placeholder MT: string which is the prefix for Matter QR codes.
	// Real payload generation requires Base38 encoding of the vendor/product ID and passcode.
	// Example formatted string: MT:Y.K9042C00KA0648G00
	return "MT:Y.K9042C00KA0648G00"
}
