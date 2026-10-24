/**
 * Tic-tac-toe rules and the house strategy behind the 404 page.
 *
 * The house searches the whole game tree before every move, so it cannot be
 * beaten — a draw is the best result available to the player. Plain .mjs so
 * tests/tic-tac-toe.test.mjs can exercise the same code the page runs.
 */

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export const EMPTY_BOARD = [null, null, null, null, null, null, null, null, null]

// Ties resolve toward the centre and the corners, which reads as natural play.
const MOVE_ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7]

export function winningLine(board) {
  for (const line of LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { owner: board[a], line }
    }
  }
  return null
}

function openSquares(board) {
  return board.map((cell, index) => (cell ? -1 : index)).filter(index => index >= 0)
}

// Positive favours the house. Shallower scores make it prefer quick wins and
// slow losses over equivalent but longer lines.
function gameValue(board, depth, isPlayerTurn) {
  const win = winningLine(board)
  if (win?.owner === 'expo') return 10 - depth
  if (win?.owner === 'you') return depth - 10
  const open = openSquares(board)
  if (!open.length) return 0

  const values = open.map(index => {
    const next = board.slice()
    next[index] = isPlayerTurn ? 'you' : 'expo'
    return gameValue(next, depth + 1, !isPlayerTurn)
  })
  return isPlayerTurn ? Math.min(...values) : Math.max(...values)
}

export function houseMove(board) {
  let best = -1
  let bestScore = Number.NEGATIVE_INFINITY
  for (const index of MOVE_ORDER) {
    if (board[index]) continue
    const next = board.slice()
    next[index] = 'expo'
    const score = gameValue(next, 1, true)
    if (score > bestScore) {
      bestScore = score
      best = index
    }
  }
  return best
}
