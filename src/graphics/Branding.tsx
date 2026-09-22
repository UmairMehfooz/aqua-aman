const DROP_PATH =
  'M12.953 0s-9 10.906-9 16.906c0 4.971 4.029 9 9 9s9-4.029 9-9c0-6-9-16.906-9-16.906zM9.026 17.496c0 1.426.668 4.25 1.134 5.426-3.042-1.494-3.846-4.425-3.846-6.463 0-3.173 3.684-7.824 5.777-12.149-.23 2.271-3.065 8.867-3.065 13.186z'

const BRAND_BLUE = '#0284c7'

export const Icon = async () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      width={18}
      height={18}
      viewBox="0 0 25.906 25.906"
    >
      <path d={DROP_PATH} style={{ fill: BRAND_BLUE }} />
    </svg>
  )
}

export const Logo = async () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlSpace="preserve"
        width={80}
        height={80}
        viewBox="0 0 25.906 25.906"
      >
        <path d={DROP_PATH} style={{ fill: BRAND_BLUE }} />
      </svg>
      <h1 style={{ fontSize: '36px', lineHeight: '40px', letterSpacing: '-0.02em', margin: 0 }}>
        Aqua Aman
      </h1>
      <p style={{ margin: 0, opacity: 0.6, fontSize: 14 }}>Water delivery management</p>
    </div>
  )
}
