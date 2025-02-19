import {execSync} from "node:child_process"
import {dirname} from "node:path"
import * as vscode from "vscode"

export function enableGitLineBlame(context: vscode.ExtensionContext) {
  // Wrap throttle and error handling.
  type commonEvent = {readonly textEditor: vscode.TextEditor}
  const updater = throttle(function wrapper(event: commonEvent) {
    try {
      updateBlame(event.textEditor)
    } catch (error) {
      vscode.window.showErrorMessage(`${error}`)
    }
  })

  // Register event listeners.
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(updater),
    vscode.window.onDidChangeTextEditorSelection(updater),
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

  function execute(command: string) {
    const cwd = dirname(path)
    return execSync(command, {cwd}).toString().trim()
  }

  const l = line + 1
  const id = execute(`git blame -L${l},${l} -l ${path}`).substring(0, 40)

  const username = execute(`git log ${id} --pretty=format:"%an" -1`)
  const timestamp = execute(`git log ${id} --pretty=format:"%at" -1`)
  const title = execute(`git log ${id} --pretty=format:"%s" -1`)

  const message = `${username}(${timestamp}) ${title}`

  const activeLineLength = editor.document.lineAt(line).text.length
  const decoration: vscode.DecorationOptions = {
    range: new vscode.Range(
      new vscode.Position(line, activeLineLength),
      new vscode.Position(line, activeLineLength + message.length),
    ),
    renderOptions: {after: {contentText: message}},
  }
  editor.setDecorations(lineBlameDecoration, [decoration])
}

/** Define line blame decoration style. */
const lineBlameDecoration = vscode.window.createTextEditorDecorationType({
  after: {
    textDecoration: "none; opacity: 0.3;",
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
  tolerance: number = 10,
) {
  let last = new Date().getTime()
  return function wrapper(...args: T) {
    last = new Date().getTime()
    setTimeout(() => {
      const now = new Date().getTime()
      if (now - last >= threshold) caller(...args)
    }, threshold + tolerance)
  }
}
