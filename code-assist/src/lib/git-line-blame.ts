import {execSync, spawnSync} from "node:child_process"
import {dirname} from "node:path"
import * as vscode from "vscode"

export function enableGitLineBlame(
  context: vscode.ExtensionContext,
  log?: vscode.OutputChannel,
) {
  // The selection change event will be called frequently,
  // that it must be throttled to improve performance.
  type commonEvent = {readonly textEditor: vscode.TextEditor}
  const updater = throttle(function wrapper(event: commonEvent) {
    try {
      updateBlame(event.textEditor)
    } catch (error) {
      log?.appendLine("")
      vscode.window.showErrorMessage(`${error}`)
    }
  })

  // Register event listeners.
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(updater),
    vscode.window.onDidChangeTextEditorVisibleRanges(updater),
  )
}

/** Update Git line blame display of the given {@link editor}. */
function updateBlame(editor: vscode.TextEditor) {
  // Avoid decoration when no file is opened.
  const path = editor.document.uri.path
  if (path == "exthost") return

  // Cancel decoration when focusing on the last line.
  const line = editor.selection.active.line
  if (line >= editor.document.lineCount - 1) {
    editor.setDecorations(lineBlameDecoration, [])
    return
  }

  /** Encapsulation of spawning a command with cwd at current {@link path}. */
  function spawn(command: string) {
    const cwd = dirname(path)
    return spawnSync(command, {cwd, shell: true})
  }

  // When not tracked by Git, return to avoid unnecessary cost.
  if (spawn("git rev-parse --is-inside-work-tree").status !== 0) return
  if (spawn(`git check-ignore ${path} --quiet`).status === 0) return

  /** Encapsulation of executing a command with cwd at current {@link path}. */
  function execute(command: string) {
    const cwd = dirname(path)
    return execSync(command, {cwd}).toString().trim()
  }

  const l = line + 1
  const id = execute(`git blame -L${l},${l} -l ${path}`).substring(0, 40)

  // Parse necessary information using Git.
  const username = execute(`git log ${id} --pretty=format:"%an" -1`)
  const timestamp = execute(`git log ${id} --pretty=format:"%at" -1`)
  const title = execute(`git log ${id} --pretty=format:"%s" -1`)

  // Format line blame info.
  const info = `${username} (${formatDuration(parseInt(timestamp))}) ${title}`

  // Apply decorations.
  const activeLineLength = editor.document.lineAt(line).text.length
  const decoration: vscode.DecorationOptions = {
    range: new vscode.Range(
      new vscode.Position(line, activeLineLength),
      new vscode.Position(line, activeLineLength + info.length),
    ),
    renderOptions: {after: {contentText: info}},
  }
  editor.setDecorations(lineBlameDecoration, [decoration])
}

/** Define line blame decoration style. */
const lineBlameDecoration = vscode.window.createTextEditorDecorationType({
  after: {
    textDecoration: "none; opacity: 0.5;",
    margin: "0 0 0 1em",
  },
})

/**
 * Throttle a function to avoid frequent call to improve performance.
 * It will wait a {@link threshold}, that if the {@link caller} is called
 * during such period of time, it won't execute the previous call.
 * The exact threshold value is {@link threshold} + {@link tolerance}.
 *
 * @param caller the function to execute.
 * @param threshold the threshold in milliseconds.
 * @param tolerance the tolerance of time delta in milliseconds.
 * @returns the same type as the {@link caller}.
 */
function throttle<T extends unknown[]>(
  caller: (...args: T) => void,
  threshold: number = 50,
) {
  let last = new Date().getTime()
  return function wrapper(...args: T) {
    setTimeout(() => {
      const now = new Date().getTime()
      if (now - last >= threshold) caller(...args)
      last = now
    }, threshold)
  }
}

/**
 * Format the duration since {@link from},
 * and return absolute date when duration is too long.
 *
 * @param from timestamp from epoch in seconds.
 */
function formatDuration(from: number): string {
  const now = new Date()
  const seconds = ((now.getTime() / 1000) | 0) - from

  // Process and return relative time if proper.
  if (seconds < 60) return `${seconds} s`
  const minutes = (seconds / 60) | 0
  if (minutes < 60) return `${minutes} min`
  const hours = (minutes / 60) | 0
  if (hours < 24) return `${hours} h`
  const days = (hours / 24) | 0
  if (days < 10) return `${days} days`

  // Return absolute time if too long.
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const date = now.getDate().toString().padStart(2, "0")
  const weekday = now.getDay()
  return `${year}.${month}.${date}(${weekday})`
}
