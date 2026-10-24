import assert from 'node:assert/strict'
import test from 'node:test'
import { EMPTY_BOARD, LINES, houseMove, winningLine } from '../lib/tic-tac-toe.mjs'

const openSquares = board => board.map((cell, index) => (cell ? -1 : index)).filter(index => index >= 0)
const play = (board, index, mark) => {
  const next = board.slice()
  next[index] = mark
  return next
}

// Separate threat scan, used only to drive the test player's policy.
function completingSquare(board, mark) {
  for (const line of LINES) {
    if (line.filter(index => board[index] === mark).length === 2) {
      const square = line.find(index => !board[index])
      if (square !== undefined) return square
    }
  }
  return -1
}

/**
 * It is the player's turn on `board`. Tries every square they could pick and
 * answers with the house's real move, so a `true` is a win the player can force.
 */
function playerCanWin(board) {
  for (const index of openSquares(board)) {
    const afterPlayer = play(board, index, 'you')
    const playerWin = winningLine(afterPlayer)
    if (playerWin?.owner === 'you') return true
    if (playerWin || !openSquares(afterPlayer).length) continue

    const afterHouse = play(afterPlayer, houseMove(afterPlayer), 'expo')
    if (winningLine(afterHouse)?.owner === 'expo') continue
    if (playerCanWin(afterHouse)) return true
  }
  return false
}

function playToEnd(board, nextSquare) {
  let current = board.slice()
  for (;;) {
    if (!openSquares(current).length) return winningLine(current)?.owner ?? 'draw'
    current = play(current, nextSquare(current), 'you')
    const playerWin = winningLine(current)
    if (playerWin) return playerWin.owner
    if (!openSquares(current).length) return 'draw'
    current = play(current, houseMove(current), 'expo')
    const houseWin = winningLine(current)
    if (houseWin) return houseWin.owner
  }
}

test('the player cannot win from the opening, trying every move they have', () => {
  assert.equal(playerCanWin(EMPTY_BOARD), false)
})

test('the house finishes its own line instead of wandering', () => {
  assert.equal(houseMove(['expo', 'expo', null, 'you', 'you', null, null, null, null]), 2)
})

test('the house blocks the player before building', () => {
  assert.equal(houseMove(['you', 'you', null, null, 'expo', null, null, null, null]), 2)
})

test('the house replies the same way to the same board', () => {
  const board = ['you', null, null, null, null, null, null, null, null]
  assert.equal(houseMove(board), houseMove(board))
})

test('careless play loses rather than draws', () => {
  // Always take the lowest free square: never blocks, never sets anything up.
  assert.equal(playToEnd(EMPTY_BOARD, board => openSquares(board)[0]), 'expo')
})

test('a player who answers threats reaches a draw, which is the best available', () => {
  const careful = board => {
    const own = completingSquare(board, 'you')
    if (own >= 0) return own
    const block = completingSquare(board, 'expo')
    if (block >= 0) return block
    return [4, 0, 2, 6, 8, 1, 3, 5, 7].find(index => !board[index])
  }
  assert.equal(playToEnd(EMPTY_BOARD, careful), 'draw')
})
