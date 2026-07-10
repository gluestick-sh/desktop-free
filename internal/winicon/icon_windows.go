//go:build windows

package winicon

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"path/filepath"
	"sync"
	"syscall"
	"unsafe"
)

var (
	shell32 = syscall.NewLazyDLL("shell32.dll")
	user32  = syscall.NewLazyDLL("user32.dll")
	gdi32   = syscall.NewLazyDLL("gdi32.dll")
	ole32   = syscall.NewLazyDLL("ole32.dll")

	procSHGetFileInfo     = shell32.NewProc("SHGetFileInfoW")
	procDestroyIcon       = user32.NewProc("DestroyIcon")
	procGetIconInfo       = user32.NewProc("GetIconInfo")
	procDrawIconEx        = user32.NewProc("DrawIconEx")
	procGetDC             = user32.NewProc("GetDC")
	procReleaseDC         = user32.NewProc("ReleaseDC")
	procGetObject         = gdi32.NewProc("GetObjectW")
	procGetDIBits         = gdi32.NewProc("GetDIBits")
	procDeleteObject      = gdi32.NewProc("DeleteObject")
	procCreateCompatibleDC = gdi32.NewProc("CreateCompatibleDC")
	procCreateDIBSection  = gdi32.NewProc("CreateDIBSection")
	procSelectObject      = gdi32.NewProc("SelectObject")
	procDeleteDC          = gdi32.NewProc("DeleteDC")
	procCoInitializeEx    = ole32.NewProc("CoInitializeEx")
)

const (
	shgfiIcon      = 0x00000100
	shgfiLargeIcon = 0x0
	biRGB          = 0
	dibRGBColors   = 0
	diNormal       = 0x0003

	coInitApartmentThreaded = 0x2
	coInitDisableOLE1DDE     = 0x4
)

type shfileinfo struct {
	hIcon         syscall.Handle
	iIcon         int32
	dwAttributes  uint32
	szDisplayName [260]uint16
	szTypeName    [80]uint16
}

type iconinfo struct {
	fIcon    int32
	xHotspot uint32
	yHotspot uint32
	hbmMask  syscall.Handle
	hbmColor syscall.Handle
}

type bitmap struct {
	bmType       int32
	bmWidth      int32
	bmHeight     int32
	bmWidthBytes int32
	bmPlanes     uint16
	bmBitsPixel  uint16
	bmBits       uintptr
}

type bitmapinfoheader struct {
	biSize          uint32
	biWidth         int32
	biHeight        int32
	biPlanes        uint16
	biBitCount      uint16
	biCompression   uint32
	biSizeImage     uint32
	biXPelsPerMeter int32
	biYPelsPerMeter int32
	biClrUsed       uint32
	biClrImportant  uint32
}

var comInit sync.Once

func ensureCOM() {
	comInit.Do(func() {
		_, _, _ = procCoInitializeEx.Call(0, uintptr(coInitApartmentThreaded|coInitDisableOLE1DDE))
	})
}

// FileIconPNG returns a PNG image of the file's shell icon.
func FileIconPNG(path string) ([]byte, error) {
	if path == "" {
		return nil, fmt.Errorf("empty path")
	}
	ensureCOM()

	winPath, err := syscall.UTF16PtrFromString(filepath.Clean(path))
	if err != nil {
		return nil, err
	}

	var info shfileinfo
	ret, _, err := procSHGetFileInfo.Call(
		uintptr(unsafe.Pointer(winPath)),
		0,
		uintptr(unsafe.Pointer(&info)),
		uintptr(unsafe.Sizeof(info)),
		uintptr(shgfiIcon|shgfiLargeIcon),
	)
	if ret == 0 || info.hIcon == 0 {
		if err != nil && err != syscall.Errno(0) {
			return nil, fmt.Errorf("SHGetFileInfo: %w", err)
		}
		return nil, fmt.Errorf("SHGetFileInfo failed for %s", path)
	}
	defer procDestroyIcon.Call(uintptr(info.hIcon))

	return hiconToPNG(info.hIcon)
}

func hiconToPNG(hIcon syscall.Handle) ([]byte, error) {
	width, height, err := iconDimensions(hIcon)
	if err != nil {
		return nil, err
	}
	if pngBytes, err := drawIconToPNG(hIcon, width, height); err == nil {
		return pngBytes, nil
	}
	return hiconToPNGLegacy(hIcon, width, height)
}

// drawIconToPNG renders an HICON onto a 32-bpp ARGB bitmap so alpha is preserved.
func drawIconToPNG(hIcon syscall.Handle, width, height int) ([]byte, error) {
	hdcScreen, _, _ := procGetDC.Call(0)
	if hdcScreen == 0 {
		return nil, fmt.Errorf("GetDC failed")
	}
	defer procReleaseDC.Call(0, hdcScreen)

	memDC, _, _ := procCreateCompatibleDC.Call(hdcScreen)
	if memDC == 0 {
		return nil, fmt.Errorf("CreateCompatibleDC failed")
	}
	defer procDeleteDC.Call(memDC)

	var bih bitmapinfoheader
	bih.biSize = uint32(unsafe.Sizeof(bih))
	bih.biWidth = int32(width)
	bih.biHeight = -int32(height)
	bih.biPlanes = 1
	bih.biBitCount = 32
	bih.biCompression = biRGB

	var bits unsafe.Pointer
	hBitmap, _, _ := procCreateDIBSection.Call(
		memDC,
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
		uintptr(unsafe.Pointer(&bits)),
		0,
		0,
	)
	if hBitmap == 0 || bits == nil {
		return nil, fmt.Errorf("CreateDIBSection failed")
	}
	defer procDeleteObject.Call(hBitmap)

	oldObj, _, _ := procSelectObject.Call(memDC, hBitmap)
	if oldObj == 0 {
		return nil, fmt.Errorf("SelectObject failed")
	}
	defer procSelectObject.Call(memDC, oldObj)

	pixels := unsafe.Slice((*byte)(bits), width*height*4)
	clear(pixels)

	r, _, err := procDrawIconEx.Call(
		memDC,
		0,
		0,
		uintptr(hIcon),
		uintptr(width),
		uintptr(height),
		0,
		0,
		diNormal,
	)
	if r == 0 {
		if err != nil && err != syscall.Errno(0) {
			return nil, fmt.Errorf("DrawIconEx: %w", err)
		}
		return nil, fmt.Errorf("DrawIconEx failed")
	}

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			i := (y*width + x) * 4
			b := pixels[i]
			g := pixels[i+1]
			r8 := pixels[i+2]
			a := pixels[i+3]
			if a == 0 {
				img.SetRGBA(x, y, color.RGBA{0, 0, 0, 0})
				continue
			}
			if a < 255 && (int(r8) > int(a) || int(g) > int(a) || int(b) > int(a)) {
				r8 = unpremultiplyChannel(r8, a)
				g = unpremultiplyChannel(g, a)
				b = unpremultiplyChannel(b, a)
			}
			img.SetRGBA(x, y, color.RGBA{r8, g, b, a})
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func iconDimensions(hIcon syscall.Handle) (int, int, error) {
	var ii iconinfo
	r, _, err := procGetIconInfo.Call(uintptr(hIcon), uintptr(unsafe.Pointer(&ii)))
	if r == 0 {
		if err != nil && err != syscall.Errno(0) {
			return 0, 0, fmt.Errorf("GetIconInfo: %w", err)
		}
		return 0, 0, fmt.Errorf("GetIconInfo failed")
	}
	defer procDeleteObject.Call(uintptr(ii.hbmMask))
	defer procDeleteObject.Call(uintptr(ii.hbmColor))

	width, height := 0, 0
	if ii.hbmColor != 0 {
		var bm bitmap
		if r, _, _ := procGetObject.Call(
			uintptr(ii.hbmColor),
			uintptr(unsafe.Sizeof(bm)),
			uintptr(unsafe.Pointer(&bm)),
		); r != 0 {
			width = int(bm.bmWidth)
			height = int(bm.bmHeight)
		}
	}
	if width <= 0 && ii.hbmMask != 0 {
		var bm bitmap
		if r, _, _ := procGetObject.Call(
			uintptr(ii.hbmMask),
			uintptr(unsafe.Sizeof(bm)),
			uintptr(unsafe.Pointer(&bm)),
		); r != 0 {
			width = int(bm.bmWidth)
			height = int(bm.bmHeight)
		}
	}
	if width <= 0 || height <= 0 {
		width, height = 32, 32
	}
	return width, height, nil
}

func unpremultiplyChannel(c, a byte) byte {
	if a == 0 {
		return 0
	}
	v := int(c) * 255 / int(a)
	if v > 255 {
		return 255
	}
	return byte(v)
}

// hiconToPNGLegacy handles older 1-bpp mask icons when DrawIconEx fails.
func hiconToPNGLegacy(hIcon syscall.Handle, width, height int) ([]byte, error) {
	var ii iconinfo
	r, _, err := procGetIconInfo.Call(uintptr(hIcon), uintptr(unsafe.Pointer(&ii)))
	if r == 0 {
		if err != nil && err != syscall.Errno(0) {
			return nil, fmt.Errorf("GetIconInfo: %w", err)
		}
		return nil, fmt.Errorf("GetIconInfo failed")
	}
	defer procDeleteObject.Call(uintptr(ii.hbmColor))
	defer procDeleteObject.Call(uintptr(ii.hbmMask))

	hdc, _, _ := procGetDC.Call(0)
	if hdc == 0 {
		return nil, fmt.Errorf("GetDC failed")
	}
	defer procReleaseDC.Call(0, hdc)

	var bm bitmap
	r, _, err = procGetObject.Call(uintptr(ii.hbmColor), uintptr(unsafe.Sizeof(bm)), uintptr(unsafe.Pointer(&bm)))
	if r == 0 {
		if err != nil && err != syscall.Errno(0) {
			return nil, fmt.Errorf("GetObject: %w", err)
		}
		return nil, fmt.Errorf("GetObject failed")
	}

	if bm.bmBitsPixel == 32 {
		return read32BitIcon(hdc, ii, int(bm.bmWidth), int(bm.bmHeight))
	}

	return readMaskedIcon(hdc, ii, width, height)
}

func read32BitIcon(hdc uintptr, ii iconinfo, width, height int) ([]byte, error) {
	var bih bitmapinfoheader
	bih.biSize = uint32(unsafe.Sizeof(bih))
	bih.biWidth = int32(width)
	bih.biHeight = -int32(height)
	bih.biPlanes = 1
	bih.biBitCount = 32
	bih.biCompression = biRGB

	colorBuf := make([]byte, width*height*4)
	r, _, err := procGetDIBits.Call(
		hdc,
		uintptr(ii.hbmColor),
		0,
		uintptr(height),
		uintptr(unsafe.Pointer(&colorBuf[0])),
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
	)
	if r == 0 {
		if err != nil && err != syscall.Errno(0) {
			return nil, fmt.Errorf("GetDIBits color: %w", err)
		}
		return nil, fmt.Errorf("GetDIBits color failed")
	}

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			i := (y*width + x) * 4
			b := colorBuf[i]
			g := colorBuf[i+1]
			r8 := colorBuf[i+2]
			a := colorBuf[i+3]
			if a == 0 {
				img.SetRGBA(x, y, color.RGBA{0, 0, 0, 0})
				continue
			}
			if a < 255 && (int(r8) > int(a) || int(g) > int(a) || int(b) > int(a)) {
				r8 = unpremultiplyChannel(r8, a)
				g = unpremultiplyChannel(g, a)
				b = unpremultiplyChannel(b, a)
			}
			img.SetRGBA(x, y, color.RGBA{r8, g, b, a})
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func readMaskedIcon(hdc uintptr, ii iconinfo, width, height int) ([]byte, error) {
	var bm bitmap
	r, _, err := procGetObject.Call(uintptr(ii.hbmColor), uintptr(unsafe.Sizeof(bm)), uintptr(unsafe.Pointer(&bm)))
	if r == 0 {
		return nil, fmt.Errorf("GetObject failed")
	}

	var bih bitmapinfoheader
	bih.biSize = uint32(unsafe.Sizeof(bih))
	bih.biWidth = bm.bmWidth
	bih.biHeight = -bm.bmHeight
	bih.biPlanes = 1
	bih.biBitCount = 32
	bih.biCompression = biRGB

	colorBuf := make([]byte, width*height*4)
	r, _, err = procGetDIBits.Call(
		hdc,
		uintptr(ii.hbmColor),
		0,
		uintptr(height),
		uintptr(unsafe.Pointer(&colorBuf[0])),
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
	)
	if r == 0 {
		if err != nil && err != syscall.Errno(0) {
			return nil, fmt.Errorf("GetDIBits color: %w", err)
		}
		return nil, fmt.Errorf("GetDIBits color failed")
	}

	maskAlpha, err := readMaskAlpha(hdc, ii.hbmMask, width, height)
	if err != nil {
		return nil, err
	}

	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			i := (y*width + x) * 4
			b := colorBuf[i]
			g := colorBuf[i+1]
			r8 := colorBuf[i+2]
			a := maskAlpha[y*width+x]
			if a == 0 {
				img.SetRGBA(x, y, color.RGBA{0, 0, 0, 0})
				continue
			}
			img.SetRGBA(x, y, color.RGBA{r8, g, b, a})
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func readMaskAlpha(hdc uintptr, hMask syscall.Handle, width, height int) ([]byte, error) {
	if hMask == 0 {
		alpha := make([]byte, width*height)
		for i := range alpha {
			alpha[i] = 255
		}
		return alpha, nil
	}

	var bm bitmap
	r, _, err := procGetObject.Call(uintptr(hMask), uintptr(unsafe.Sizeof(bm)), uintptr(unsafe.Pointer(&bm)))
	if r == 0 {
		if err != nil && err != syscall.Errno(0) {
			return nil, fmt.Errorf("GetObject mask: %w", err)
		}
		return nil, fmt.Errorf("GetObject mask failed")
	}

	maskWidth := int(bm.bmWidth)
	maskHeight := int(bm.bmHeight)
	if maskWidth <= 0 || maskHeight <= 0 {
		alpha := make([]byte, width*height)
		for i := range alpha {
			alpha[i] = 255
		}
		return alpha, nil
	}

	var bih bitmapinfoheader
	bih.biSize = uint32(unsafe.Sizeof(bih))
	bih.biWidth = int32(maskWidth)
	bih.biHeight = -int32(maskHeight)
	bih.biPlanes = 1
	bih.biBitCount = 1
	bih.biCompression = biRGB

	rowBytes := ((maskWidth + 31) / 32) * 4
	maskBuf := make([]byte, rowBytes*maskHeight)
	r, _, err = procGetDIBits.Call(
		hdc,
		uintptr(hMask),
		0,
		uintptr(maskHeight),
		uintptr(unsafe.Pointer(&maskBuf[0])),
		uintptr(unsafe.Pointer(&bih)),
		dibRGBColors,
	)
	if r == 0 {
		if err != nil && err != syscall.Errno(0) {
			return nil, fmt.Errorf("GetDIBits mask: %w", err)
		}
		return nil, fmt.Errorf("GetDIBits mask failed")
	}

	alpha := make([]byte, width*height)
	for y := 0; y < height; y++ {
		my := y
		if my >= maskHeight {
			my = maskHeight - 1
		}
		for x := 0; x < width; x++ {
			mx := x
			if mx >= maskWidth {
				mx = maskWidth - 1
			}
			byteIdx := my*rowBytes + mx/8
			bit := uint(7 - (mx % 8))
			if byteIdx < len(maskBuf) && (maskBuf[byteIdx]>>bit)&1 == 0 {
				alpha[y*width+x] = 255
			}
		}
	}
	return alpha, nil
}
