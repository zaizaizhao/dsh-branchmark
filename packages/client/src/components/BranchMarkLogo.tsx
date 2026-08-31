import type { SVGProps } from 'react'

/** Presentation options for the BranchMark thread-bound-book emblem. */
export interface BranchMarkLogoProps extends Omit<SVGProps<SVGSVGElement>, 'height' | 'width'> {
  /** Uses the reduced geometry intended for the collapsed Dock handle. */
  readonly compact?: boolean
  /** Rendered square size in CSS pixels. */
  readonly size?: number
}

/** Renders the theme-aware BranchMark book, growing branches, and source mark.
 * @param props - SVG attributes plus size and compact-geometry selection.
 * @returns A monochrome decorative emblem that follows the DSH text color.
 */
export function BranchMarkLogo({ compact = false, size = 26, className, ...props }: BranchMarkLogoProps) {
  const classes = ['dbm-brandmark', className].filter(Boolean).join(' ')
  return (
    <svg
      {...props}
      aria-hidden="true"
      className={classes}
      data-branchmark-logo="threadbook"
      data-compact={compact}
      focusable="false"
      height={size}
      viewBox={compact ? '0 0 32 32' : '0 0 64 64'}
      width={size}
    >
      {compact ? (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path className="dbm-brandmark-page" d="m6.1 10.7 13-1.5 2.4 1.3v17.1l-2.4 1.2-13-2.1Z" strokeWidth="1.35" />
          <path className="dbm-brandmark-detail" d="m19.1 9.2 1.1 1.2v17.7M8.3 10.5v16.6M5.9 14.4c.9.7 1.8.8 2.7.3M5.9 19c.9.7 1.8.8 2.7.3M5.9 23.6c.9.7 1.8.8 2.7.3" strokeWidth=".85" />
          <path className="dbm-brandmark-branch" d="M18.2 9.9c-.7-2.2-2-3.5-.6-5.5 1.2-1.8 3.5-2.3 5.8-3.4M19.4 5.4c1.7-.1 2.8.6 3.8 1.5" strokeWidth="1.45" />
          <path className="dbm-brandmark-leaf" d="M23 1.2c.8-1.1 1.8-1.4 3.1-.9-.7 1.3-1.7 1.6-3.1.9ZM22.9 6.9c1.2-.7 2.3-.6 3.2.3-1.2.8-2.3.7-3.2-.3Z" />
          <path className="dbm-brandmark-branch" d="M10.5 27.4c2.7-5.5 6.2-8.3 11.3-9.5 2.7-.7 4.2-2.4 5.2-4.8" strokeWidth="1.35" />
          <path className="dbm-brandmark-leaf" d="M26.6 13.5c.6-1.3 1.7-1.9 3.1-1.7-.5 1.5-1.6 2.1-3.1 1.7Z" />
          <circle className="dbm-brandmark-seal" cx="18.2" cy="9.9" r="1.35" strokeWidth=".45" />
        </g>
      ) : (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path className="dbm-brandmark-page" d="M15.1 21.5 42.2 18.5l5 2.5v34.4l-4.8 2.4-27.3-4.4Z" strokeWidth="2" />
          <path className="dbm-brandmark-detail" d="m42.2 18.5 2.5 2.2v35.8M39.5 19l2.6 2.1v36.2" strokeWidth="1" />
          <path className="dbm-brandmark-cover" d="M14.8 21.8 39.5 19v37.9l-24.7-3.8Z" strokeWidth="2" />
          <path className="dbm-brandmark-binding" d="M19 21.3v32.5M14.5 28.2c1.7 1.2 3.6 1.4 5.4.5M14.5 36.2c1.7 1.2 3.6 1.4 5.4.5M14.5 44.2c1.7 1.2 3.6 1.4 5.4.5M14.5 51.1c1.7 1.2 3.6 1.4 5.4.5" strokeWidth="1.35" />
          <path className="dbm-brandmark-binding" d="M20.7 22.1 38.1 20.2M20.7 24.1l17.4-2" opacity=".72" strokeWidth="1" />
          <path className="dbm-brandmark-branch" d="M39.8 19.6c-1.2-4.5-4.2-6.5-1.4-11C40.9 4.6 46.5 4 51 1.9" strokeWidth="2.5" />
          <path className="dbm-brandmark-branch" d="M39.2 11.6c-3.8-1.7-5.6-4.1-5.5-7.3M42.8 6.2c3.3-.3 5.2.9 7.2 2.9" strokeWidth="1.45" />
          <path className="dbm-brandmark-leaf" d="M50.2 2.4c1.2-2 3.1-2.7 5.5-2.1-.9 2.4-2.8 3.3-5.5 2.1ZM33.8 4.8c-1.6-1.2-2.1-2.8-1.4-4.6 1.9.9 2.5 2.4 1.4 4.6ZM49.3 9.2c2.1-1.4 4.1-1.3 5.9.3-2 1.6-4 1.5-5.9-.3Z" />
          <path className="dbm-brandmark-branch" d="M24.1 54.3c5.8-11.6 12.8-17.1 23.4-19.5 5.3-1.2 8.2-4.7 10-9.3" strokeWidth="2.25" />
          <path className="dbm-brandmark-branch" d="M47.3 34.8c2.4-3.4 5-5.2 8.4-5.5" strokeWidth="1.35" />
          <path className="dbm-brandmark-leaf" d="M55 29.6c1.2-2.4 3.2-3.5 5.9-3.2-.9 2.7-2.9 3.8-5.9 3.2Z" />
          <circle className="dbm-brandmark-seal" cx="39.8" cy="19.6" r="2.35" strokeWidth=".75" />
        </g>
      )}
    </svg>
  )
}
