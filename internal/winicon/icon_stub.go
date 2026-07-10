//go:build !windows

package winicon

import "errors"

var errUnsupported = errors.New("file icons are only supported on Windows")

// FileIconPNG returns a PNG image of the file's shell icon.
func FileIconPNG(path string) ([]byte, error) {
	_ = path
	return nil, errUnsupported
}
