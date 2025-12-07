package logging

import (
	"os"

	"github.com/Saavuori/ruuvi-go-gateway/config"
	log "github.com/sirupsen/logrus"
)

func Setup(conf config.Logging) {
	switch conf.Level {
	case "trace":
		log.SetLevel(log.TraceLevel)
	case "debug":
		log.SetLevel(log.DebugLevel)
	case "info":
		log.SetLevel(log.InfoLevel)
	case "warn":
		log.SetLevel(log.WarnLevel)
	case "error":
		log.SetLevel(log.ErrorLevel)
	case "fatal":
		log.SetLevel(log.FatalLevel)
	case "panic":
		log.SetLevel(log.PanicLevel)
	case "":
		log.SetLevel(log.InfoLevel)
	default:
		log.WithField("configured_level", conf.Level).Fatal("Invalid logging level")
	}

	switch conf.Type {
	case "json":
		log.SetFormatter(&log.JSONFormatter{
			TimestampFormat: "2006-01-02 15:04:05",
		})
	case "structured", "simple", "":
		log.SetFormatter(&log.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "2006-01-02 15:04:05",
		})
	default:
		log.WithField("configured_type", conf.Type).Fatal("Invalid logging type")
	}

	if conf.Timestamps != nil && !*conf.Timestamps {
		if f, ok := log.StandardLogger().Formatter.(*log.TextFormatter); ok {
			f.DisableTimestamp = true
		}
		if f, ok := log.StandardLogger().Formatter.(*log.JSONFormatter); ok {
			f.DisableTimestamp = true
		}
	}

	if conf.WithCaller {
		log.SetReportCaller(true)
	}

	log.SetOutput(os.Stdout)
}
