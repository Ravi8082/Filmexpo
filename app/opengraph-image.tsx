import { ImageResponse } from 'next/og'

export const alt = 'Film Expo India — Where stories take shape'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '72px',
        color: '#f5f0e6',
        background: 'linear-gradient(135deg, #071923 0%, #102f3b 58%, #13232b 100%)',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ display: 'flex', color: '#e4ad4d', fontFamily: 'Arial', fontSize: 22, letterSpacing: 8 }}>
        FILM EXPO INDIA
      </div>
      <div style={{ display: 'flex', marginTop: 38, fontSize: 76, lineHeight: 1.05 }}>
        Where stories
      </div>
      <div style={{ display: 'flex', color: '#e4ad4d', fontSize: 76, lineHeight: 1.05 }}>
        take shape.
      </div>
      <div style={{ display: 'flex', marginTop: 36, color: '#c2cdd0', fontFamily: 'Arial', fontSize: 25 }}>
        India’s film and media gathering
      </div>
    </div>,
    size,
  )
}
