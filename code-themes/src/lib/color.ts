export class ColorRGB {
  constructor(
    readonly red: number,
    readonly green: number,
    readonly blue: number,
  ) {}

  static fromCode(code: string) {}

  get code(): string {
    return `#${pad2(this.red)}${pad2(this.green)}${pad2(this.blue)}`
  }
}

export class ColorRGBA extends ColorRGB {
  constructor(
    red: number,
    green: number,
    blue: number,
    readonly alpha: number,
  ) {
    super(red, green, blue)
  }

  static fromCode(code: string) {}

  override get code(): string {
    return `${super.code}${pad2(this.alpha)}`
  }
}

export function colorCodeHasAlpha(code: string): boolean {
  if (/^(#[0-9a-fA-F]{4}|#[0-9a-fA-F]{8})$/g.test(code)) return true
  if (/^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})$/g.test(code)) return false
  throw new Error(`not a color code: ${code}`)
}

function pad2(raw: number, radix: number = 16) {
  return raw.toString(radix).padStart(2, "0")
}
