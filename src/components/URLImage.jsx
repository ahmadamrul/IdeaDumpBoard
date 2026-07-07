import { useEffect, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'

// Loads a data-URL / URL into an HTMLImageElement and renders it on the canvas.
export default function URLImage({ element, ...props }) {
  const [img, setImg] = useState(null)

  useEffect(() => {
    if (!element.src) return
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src = element.src
    const onLoad = () => setImg(image)
    image.addEventListener('load', onLoad)
    return () => image.removeEventListener('load', onLoad)
  }, [element.src])

  if (!img) return null

  return (
    <KonvaImage
      image={img}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      {...props}
    />
  )
}
