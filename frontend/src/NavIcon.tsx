export type NavIconName = 'bucket' | 'browse' | 'templates' | 'installed' | 'updates' | 'storage' | 'activity' | 'pro'

const ICON_PATHS: Record<NavIconName, string> = {
  bucket: 'M4 7.5h16M7 7.5V5.25A1.25 1.25 0 0 1 8.25 4h7.5A1.25 1.25 0 0 1 17 5.25V7.5M5.5 7.5l1.1 11A1.75 1.75 0 0 0 8.34 20h7.32a1.75 1.75 0 0 0 1.74-1.5l1.1-11M9 11h6M9 15h6',
  browse: 'M10.75 18.5a7.75 7.75 0 1 1 5.48-2.27L20 20M8 8.5h5.5M8 12h4',
  templates: 'M4 6.5h7v7H4zM13 6.5h7v4h-7zM13 12.5h7v5h-7zM4 15.5h7v2H4z',
  installed: 'M4.75 12.5 9.5 17.25 19.25 7.5M6.5 19.5h11A1.5 1.5 0 0 0 19 18v-4.25M5 13.75V18a1.5 1.5 0 0 0 1.5 1.5M8 4.5h8a1.5 1.5 0 0 1 1.5 1.5v4',
  updates: 'M12 4v9M8.5 9.5 12 13l3.5-3.5M5 19h14',
  storage: 'M4 6.5h16v11H4zM7 6.5V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1.5M8 10.5h8M8 14h5',
  activity: 'M4 12h3l2-5 4 10 2-5h5M5.5 5.5A8.5 8.5 0 1 1 4 12',
  pro: 'M4 19h16M6.5 19 9 6 12 11.5 14.5 3 17 11.5 17.5 19',
}

interface NavIconProps {
  name: NavIconName
  className?: string
}

export default function NavIcon({ name, className }: NavIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}
