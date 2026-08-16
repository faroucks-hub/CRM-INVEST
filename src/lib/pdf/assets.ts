export function getPdfLogoSource() {
  if (typeof window !== 'undefined') {
    return new URL('/im.png', window.location.origin).toString()
  }
  return `${process.cwd()}/public/im.png`
}
