import {describe, expect, test} from "vitest"
import {dotToTree, updateObject} from "./generate"

describe("update object", () => {
  test("empty path error", () => {
    expect(() => updateObject({}, [], 123)).toThrowError("path cannot be empty")
  })

  test("single layer", () => {
    const raw = {}
    updateObject(raw, ["a"], 123)
    expect(raw).toStrictEqual({a: 123})

    // Create another key.
    updateObject(raw, ["b"], 456)
    expect(raw).toStrictEqual({a: 123, b: 456})

    // Update existing key.
    updateObject(raw, ["a"], 789)
    expect(raw).toStrictEqual({a: 789, b: 456})
  })

  test("multi layer", () => {
    const raw = {}
    updateObject(raw, ["a", "b", "c"], 123)
    expect(raw).toStrictEqual({a: {b: {c: 123}}})
  })
})

test("dot to tree", () => {
  const raw = {
    a: 123,
    "b.c": 456,
    "d.e.f": 789,
  }

  expect(dotToTree(raw)).toStrictEqual({
    a: 123,
    b: {c: 456},
    d: {e: {f: 789}},
  })
})
