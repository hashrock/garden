export class TarBuilder {
  private files: Array<{ name: string; data: Uint8Array }> = []

  addFile(name: string, data: Uint8Array | string) {
    const bytes = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data
    this.files.push({ name, data: bytes })
  }

  build(): Uint8Array {
    const blocks: Uint8Array[] = []
    
    for (const file of this.files) {
      const header = this.createHeader(file.name, file.data.length)
      blocks.push(header)
      blocks.push(file.data)
      
      const padding = (512 - (file.data.length % 512)) % 512
      if (padding > 0) {
        blocks.push(new Uint8Array(padding))
      }
    }
    
    blocks.push(new Uint8Array(1024))
    
    const totalSize = blocks.reduce((sum, block) => sum + block.length, 0)
    const result = new Uint8Array(totalSize)
    let offset = 0
    
    for (const block of blocks) {
      result.set(block, offset)
      offset += block.length
    }
    
    return result
  }

  private createHeader(filename: string, filesize: number): Uint8Array {
    const header = new Uint8Array(512)
    const encoder = new TextEncoder()
    
    const nameBytes = encoder.encode(filename)
    header.set(nameBytes.slice(0, 100), 0)
    
    const mode = '0000644'
    header.set(encoder.encode(mode), 100)
    
    const uid = '0000000'
    header.set(encoder.encode(uid), 108)
    
    const gid = '0000000'
    header.set(encoder.encode(gid), 116)
    
    const size = filesize.toString(8).padStart(11, '0')
    header.set(encoder.encode(size), 124)
    
    const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0')
    header.set(encoder.encode(mtime), 136)
    
    header.set(encoder.encode('        '), 148)
    
    header[156] = 48
    
    const checksum = this.calculateChecksum(header)
    const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 '
    header.set(encoder.encode(checksumStr), 148)
    
    return header
  }

  private calculateChecksum(header: Uint8Array): number {
    let sum = 0
    for (let i = 0; i < 512; i++) {
      sum += header[i]
    }
    return sum
  }
}

export class TarExtractor {
  extract(data: Uint8Array): Array<{ name: string; data: Uint8Array }> {
    const files: Array<{ name: string; data: Uint8Array }> = []
    let offset = 0
    
    while (offset < data.length - 512) {
      const header = data.slice(offset, offset + 512)
      
      if (this.isEmptyBlock(header)) {
        break
      }
      
      const filename = this.extractString(header, 0, 100)
      const filesize = parseInt(this.extractString(header, 124, 12), 8)
      
      if (!filename || isNaN(filesize)) {
        break
      }
      
      offset += 512
      
      const fileData = data.slice(offset, offset + filesize)
      files.push({ name: filename, data: fileData })
      
      offset += filesize
      const padding = (512 - (filesize % 512)) % 512
      offset += padding
    }
    
    return files
  }

  private extractString(data: Uint8Array, start: number, length: number): string {
    const bytes = data.slice(start, start + length)
    const nullIndex = bytes.indexOf(0)
    const trimmed = nullIndex >= 0 ? bytes.slice(0, nullIndex) : bytes
    return new TextDecoder().decode(trimmed).trim()
  }

  private isEmptyBlock(block: Uint8Array): boolean {
    return block.every(byte => byte === 0)
  }
}