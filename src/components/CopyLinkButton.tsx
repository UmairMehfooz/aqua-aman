'use client'

import { useState } from 'react'

export const CopyLinkButton = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn--size-medium btn--style-secondary">
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}
