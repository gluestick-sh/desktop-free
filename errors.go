package main

import (
	"fmt"

	"github.com/gluestick-sh/core/engine"
)

func resultError(result *engine.Result) error {
	if result == nil || result.Status == engine.StatusSuccess {
		return nil
	}
	if result.Error != nil {
		return result.Error
	}
	if result.Message != "" {
		return fmt.Errorf("%s", result.Message)
	}
	return fmt.Errorf("operation failed")
}
