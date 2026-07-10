//go:build windows

package winicon

import (
	"bytes"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func TestFileIconPNGSystemExe(t *testing.T) {
	windir := os.Getenv("WINDIR")
	if windir == "" {
		t.Skip("WINDIR not set")
	}
	path := filepath.Join(windir, "System32", "notepad.exe")
	if _, err := os.Stat(path); err != nil {
		t.Skipf("notepad.exe not found: %v", err)
	}

	pngBytes, err := FileIconPNG(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(pngBytes) < 8 || pngBytes[0] != 0x89 || string(pngBytes[1:4]) != "PNG" {
		t.Fatalf("expected PNG header, got %d bytes", len(pngBytes))
	}

	img, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		t.Fatalf("decode png: %v", err)
	}
	bounds := img.Bounds()
	transparent := 0
	opaqueBlack := 0
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			_, _, _, a := img.At(x, y).RGBA()
			if a>>8 == 0 {
				transparent++
				continue
			}
			r, g, b, _ := img.At(x, y).RGBA()
			if r>>8 == 0 && g>>8 == 0 && b>>8 == 0 && a>>8 == 255 {
				opaqueBlack++
			}
		}
	}
	if transparent == 0 {
		t.Fatal("expected transparent pixels in icon PNG")
	}
	if opaqueBlack > transparent*2 {
		t.Fatalf("too many opaque black pixels (%d transparent, %d opaque black)", transparent, opaqueBlack)
	}
}
