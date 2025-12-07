package gateway

import (
	"github.com/Saavuori/ruuvi-go-gateway/config"
	"github.com/rigado/ble"
	"github.com/rigado/ble/examples/lib/dev"
	"github.com/rigado/ble/linux/hci/cmd"
	log "github.com/sirupsen/logrus"
)

func newDevice(conf config.Config) (ble.Device, error) {
	device, err := dev.NewDevice("default",
		ble.OptDeviceID(conf.HciIndex),
		ble.OptScanParams(cmd.LESetScanParameters{
			LEScanType:     0, // passive scan
			LEScanInterval: 0x10,
			LEScanWindow:   0x10,
		}))
	if err != nil {
		log.WithError(err).WithFields(log.Fields{
			"hci_index": conf.HciIndex,
		}).Error("Can't setup bluetooth device")
		return nil, err
	}
	return device, nil
}
