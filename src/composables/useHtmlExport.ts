import ColorThief from 'colorthief'
import type { ImageItem, Artboard } from '../types'

export function useHtmlExport() {
  const colorThief = new ColorThief()

  const getAccentColor = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const palette = colorThief.getPalette(img, 5)
          if (palette && palette.length > 0) {
            // Get the dominant color
            const [r, g, b] = palette[0]
            resolve(`rgb(${r}, ${g}, ${b})`)
          } else {
            resolve('#3b82f6') // Default blue color
          }
        } catch (error) {
          console.error('Error extracting color:', error)
          resolve('#3b82f6') // Default blue color
        }
      }
      
      img.onerror = () => {
        resolve('#3b82f6') // Default blue color
      }
      
      img.src = imageUrl
    })
  }

  const generateHtmlGallery = async (
    artboard: Artboard,
    images: ImageItem[]
  ): Promise<{ html: string; images: Array<{ filename: string; data: string }> }> => {
    // Filter images belonging to this artboard
    const artboardImages = images.filter(img => img.artboardId === artboard.id)
    
    if (artboardImages.length === 0) {
      throw new Error('No images in this artboard')
    }

    // Get accent color from first image
    const accentColor = await getAccentColor(artboardImages[0].dataUrl)
    
    // Prepare image files
    const imageFiles: Array<{ filename: string; data: string }> = []
    artboardImages.forEach((img, index) => {
      const filename = `image_${index + 1}.jpg`
      imageFiles.push({
        filename,
        data: img.dataUrl
      })
    })

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${artboard.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --accent-color: ${accentColor};
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #1a1a1a;
            color: #f0f0f0;
            min-height: 100vh;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            margin-bottom: 80px;
        }
        
        h1 {
            font-size: 4rem;
            font-weight: 700;
            color: var(--accent-color);
            letter-spacing: -0.02em;
            line-height: 1.1;
        }
        
        .gallery {
            display: flex;
            flex-direction: column;
            gap: 80px;
        }
        
        .image-container {
            position: relative;
        }
        
        .image-wrapper {
            position: relative;
            width: 100%;
            background: #1a1a1a;
        }
        
        .gallery-image {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .image-info {
            margin-top: 24px;
        }
        
        .image-title {
            font-size: 2.5rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 12px;
            letter-spacing: -0.01em;
        }
        
        .image-description {
            color: #a0a0a0;
            font-size: 1.25rem;
            line-height: 1.6;
        }
        
        footer {
            margin-top: 120px;
            padding-top: 40px;
            border-top: 1px solid #333;
            color: #666;
            font-size: 0.9rem;
        }
        
        footer a {
            color: var(--accent-color);
            text-decoration: none;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2.5rem;
            }
            
            .image-title {
                font-size: 1.8rem;
            }
            
            .image-description {
                font-size: 1.1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${artboard.name}</h1>
        </header>
        
        <div class="gallery">
            ${artboardImages.map((img, index) => `
            <div class="image-container">
                <div class="image-wrapper">
                    <img src="image_${index + 1}.jpg" alt="${img.title || ''}" class="gallery-image">
                </div>
                ${(img.title || img.description) ? `
                <div class="image-info">
                    ${img.title ? `<h2 class="image-title">${img.title}</h2>` : ''}
                    ${img.description ? `<p class="image-description">${img.description}</p>` : ''}
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>
        
        <footer>
            <p>Created with Garden • ${new Date().toLocaleDateString()}</p>
        </footer>
    </div>
</body>
</html>`

    return { html, images: imageFiles }
  }

  // Simple TAR file creation
  const createTarArchive = (files: Array<{ name: string; content: ArrayBuffer | string }>): ArrayBuffer => {
    const encoder = new TextEncoder()
    const blocks: Uint8Array[] = []
    
    for (const file of files) {
      const content = typeof file.content === 'string' 
        ? encoder.encode(file.content) 
        : new Uint8Array(file.content)
      
      const header = new Uint8Array(512)
      const nameBytes = encoder.encode(file.name)
      header.set(nameBytes, 0)
      
      // File mode (644 in octal)
      header.set(encoder.encode('0000644'), 100)
      
      // UID and GID
      header.set(encoder.encode('0000000'), 108)
      header.set(encoder.encode('0000000'), 116)
      
      // File size in octal
      const sizeOctal = content.length.toString(8).padStart(11, '0')
      header.set(encoder.encode(sizeOctal), 124)
      
      // Modification time
      const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0')
      header.set(encoder.encode(mtime), 136)
      
      // Checksum placeholder
      header.set(encoder.encode('        '), 148)
      
      // Type flag (0 for regular file)
      header[156] = 48 // '0'
      
      // Calculate checksum
      let checksum = 0
      for (let i = 0; i < 512; i++) {
        checksum += header[i]
      }
      const checksumOctal = checksum.toString(8).padStart(6, '0') + '\0 '
      header.set(encoder.encode(checksumOctal), 148)
      
      blocks.push(header)
      blocks.push(content)
      
      // Padding to 512 byte boundary
      const padding = 512 - (content.length % 512)
      if (padding < 512) {
        blocks.push(new Uint8Array(padding))
      }
    }
    
    // Add two 512-byte blocks of zeros at the end
    blocks.push(new Uint8Array(512))
    blocks.push(new Uint8Array(512))
    
    // Combine all blocks
    const totalLength = blocks.reduce((sum, block) => sum + block.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const block of blocks) {
      result.set(block, offset)
      offset += block.length
    }
    
    return result.buffer
  }

  const exportAsHtmlArchive = async (
    artboard: Artboard,
    images: ImageItem[]
  ): Promise<void> => {
    try {
      const { html, images: imageFiles } = await generateHtmlGallery(artboard, images)
      
      const files: Array<{ name: string; content: ArrayBuffer | string }> = [
        { name: 'index.html', content: html }
      ]
      
      // Convert base64 images to ArrayBuffer
      for (const img of imageFiles) {
        const base64Data = img.data.split(',')[1]
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        files.push({ name: img.filename, content: bytes.buffer })
      }
      
      const tarData = createTarArchive(files)
      
      // Compress with gzip
      const compressionStream = new CompressionStream('gzip')
      const writer = compressionStream.writable.getWriter()
      writer.write(tarData)
      writer.close()
      
      const compressedData = await new Response(compressionStream.readable).arrayBuffer()
      
      // Download the tar.gz file
      const blob = new Blob([compressedData], { type: 'application/gzip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${artboard.name.toLowerCase().replace(/\s+/g, '_')}_gallery.tar.gz`
      a.click()
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error exporting HTML gallery:', error)
      throw error
    }
  }

  return {
    exportAsHtmlArchive
  }
}