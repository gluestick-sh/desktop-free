package main

import (
	"fmt"

	"github.com/gluestick-sh/core/device"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// deviceClientName identifies this app in device.json clients. The free desktop
// build reports "desktop"; the Pro build reports "desktop-pro" so both can share
// one ~/.glue without overwriting each other.
const deviceClientName = "desktop"

// DeviceInfoDTO is the device identity exposed to the frontend.
type DeviceInfoDTO struct {
	SchemaVersion int                          `json:"schemaVersion"`
	DeviceID      string                       `json:"deviceId"`
	CreatedAt     string                       `json:"createdAt"`
	DisplayName   string                       `json:"displayName"`
	DisplayLabel  string                       `json:"displayLabel"`
	Platform      device.Platform              `json:"platform"`
	Clients       map[string]device.ClientInfo `json:"clients,omitempty"`
	Path          string                       `json:"path"`
}

func deviceInfoDTO(root string, info *device.Info) DeviceInfoDTO {
	dto := DeviceInfoDTO{
		Path: device.Path(root),
	}
	if info == nil {
		return dto
	}
	dto.SchemaVersion = info.SchemaVersion
	dto.DeviceID = info.DeviceID
	dto.CreatedAt = info.CreatedAt
	dto.DisplayName = info.DisplayName
	dto.DisplayLabel = device.DisplayLabel(info)
	dto.Platform = info.Platform
	dto.Clients = info.Clients
	return dto
}

// GetDeviceInfo returns the stable glue-root device identity.
func (a *App) GetDeviceInfo() (*DeviceInfoDTO, error) {
	root := a.glueRootDir()
	if root == "" {
		return nil, fmt.Errorf("glue root directory unavailable")
	}
	info, err := device.Ensure(root)
	if err != nil {
		return nil, err
	}
	dto := deviceInfoDTO(root, info)
	return &dto, nil
}

// SetDeviceDisplayName updates the user-facing device name.
func (a *App) SetDeviceDisplayName(name string) (*DeviceInfoDTO, error) {
	root := a.glueRootDir()
	if root == "" {
		return nil, fmt.Errorf("glue root directory unavailable")
	}
	if err := device.SetDisplayName(root, name); err != nil {
		return nil, err
	}
	_ = device.TouchClient(root, deviceClientName, Version)
	info, err := device.Get(root)
	if err != nil {
		return nil, err
	}
	dto := deviceInfoDTO(root, info)
	return &dto, nil
}

func (a *App) touchDesktopDeviceClient() {
	root := a.glueRootDir()
	if root == "" {
		return
	}
	if err := device.TouchClient(root, deviceClientName, Version); err != nil && a.ctx != nil {
		runtime.LogWarning(a.ctx, fmt.Sprintf("device touch: %v", err))
	}
}
