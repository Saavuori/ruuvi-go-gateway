//go:build !linux
// +build !linux

package gateway

import (
	"errors"

	"github.com/Saavuori/ruuvi-go-gateway/config"
	"github.com/rigado/ble"
)

func newDevice(conf config.Config) (ble.Device, error) {
	return nil, errors.New("real bluetooth hardware only supported on linux")
}
