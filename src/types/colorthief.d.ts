declare module 'colorthief' {
  export default class ColorThief {
    getColor(sourceImage: HTMLImageElement | null, quality?: number): [number, number, number] | null
    getPalette(sourceImage: HTMLImageElement | null, colorCount?: number, quality?: number): Array<[number, number, number]> | null
  }
}