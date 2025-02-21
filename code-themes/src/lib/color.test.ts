import {describe, expect, test} from "vitest"
import {colorCodeHasAlpha} from "./color"

describe("color code has alpha", () => {
  test("yes", () => {
    expect(colorCodeHasAlpha("#1234")).toBe(true)
    expect(colorCodeHasAlpha("#1234abcd")).toBe(true)
  })

  test("no", () => {
    expect(colorCodeHasAlpha("#123")).toBe(false)
    expect(colorCodeHasAlpha("#123abc")).toBe(false)
  })

  test("invalid", () => {
    const code = "#1234abc"
    expect(() => colorCodeHasAlpha(code)).toThrowError(
      `not a color code: ${code}`,
    )
  })
})
