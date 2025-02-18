import {execSync} from "node:child_process"
import {dirname} from "node:path"
import * as vscode from "vscode"

export function enableGitLineBlame(context: vscode.ExtensionContext) {
  function updater(event: {readonly textEditor: vscode.TextEditor}) {
    try {
      updateBlame(event.textEditor)
    } catch (error) {
      vscode.window.showErrorMessage(`${error}`)
    }
  }

  // Register subscriptions.
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(updater),
    vscode.window.onDidChangeTextEditorSelection(updater),
  )
}

/** Update Git line blame display of the given {@link editor}. */
function updateBlame(editor: vscode.TextEditor) {
  const path = editor.document.uri.path
  if (path == "exthost") return // When no file is opened.

  const line = editor.selection.active.line
  if (line >= editor.document.lineCount - 1) return // Cannot blame last line.

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
