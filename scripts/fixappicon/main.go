// Command fixappicon removes opaque black backgrounds from build/appicon.png
// so Windows taskbar icons stay visible on dark themes.
// Run from desktop/: go run ./scripts/fixappicon
package main

import (
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
)

func main() {
	root, err := os.Getwd()
	if err != nil {
		fatal(err)
	}
	appicon := filepath.Join(root, "build", "appicon.png")
	src, err := decodePNG(appicon)
	if err != nil {
		fatal(err)
	}
	out := flattenBlackBackground(src)

	targets := []string{
		appicon,
		filepath.Join(root, "frontend", "public", "appicon.png"),
	}
	for _, path := range targets {
		if err := writePNG(path, out); err != nil {
			fatal(err)
		}
	}
	fmt.Println("Updated app icons with transparent background:", targets[0])
}

func decodePNG(path string) (image.Image, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return png.Decode(f)
}

func flattenBlackBackground(src image.Image) *image.NRGBA {
	bounds := src.Bounds()
	out := image.NewNRGBA(bounds)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := src.At(x, y).RGBA()
			nr := uint8(r >> 8)
			ng := uint8(g >> 8)
			nb := uint8(b >> 8)
			na := uint8(a >> 8)
			if na > 0 && nr < 24 && ng < 24 && nb < 24 {
				na = 0
			}
			out.SetNRGBA(x, y, color.NRGBA{R: nr, G: ng, B: nb, A: na})
		}
	}
	return out
}

func writePNG(path string, img image.Image) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return png.Encode(f, img)
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
