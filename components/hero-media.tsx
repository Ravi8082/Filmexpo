import Image from 'next/image'

type HeroMediaProps = {
  image: string
  video?: string
  className: string
  videoClassName: string
  alt?: string
  priority?: boolean
}

export function HeroMedia({ image, video, className, videoClassName, alt = '', priority = false }: HeroMediaProps) {
  if (video) {
    return (
      <video className={videoClassName} src={video} poster={image || undefined} autoPlay muted loop playsInline />
    )
  }
  if (!image) return null
  return <Image className={className} src={image} alt={alt} fill priority={priority} sizes="100vw" unoptimized={image.endsWith('.svg')} />
}
