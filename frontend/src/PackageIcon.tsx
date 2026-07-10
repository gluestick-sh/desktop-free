import { useEffect, useState } from 'react'
import { GetPackageIcon } from '../wailsjs/go/main/App'

interface PackageIconProps {
  packageName: string
  size?: number
}

export default function PackageIcon({ packageName, size = 20 }: PackageIconProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    void GetPackageIcon(packageName)
      .then((b64) => {
        if (cancelled || !b64) return
        setSrc(`data:image/png;base64,${b64}`)
      })
      .catch(() => {
        /* no icon available */
      })
    return () => {
      cancelled = true
    }
  }, [packageName])

  return (
    <span className="package-icon" style={{ width: size, height: size }} aria-hidden="true">
      {src ? (
        <img src={src} alt="" width={size} height={size} draggable={false} />
      ) : (
        <span className="package-icon-fallback" />
      )}
    </span>
  )
}
