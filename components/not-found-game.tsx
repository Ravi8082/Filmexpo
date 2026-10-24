'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { EMPTY_BOARD, houseMove, winningLine } from '@/lib/tic-tac-toe.mjs'

type Cell = 'you' | 'expo' | null

export function NotFoundGame() {
  const [board, setBoard] = useState<Cell[]>(EMPTY_BOARD)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState({ you: 0, expo: 0 })
  const countedRound = useRef(-1)

  const win = useMemo(() => winningLine(board), [board])
  const isFull = board.every(Boolean)
  const outcome: 'you' | 'expo' | 'draw' | null = win?.owner ?? (isFull ? 'draw' : null)
  const [expoCount, youCount] = useMemo(() => [
    board.filter(cell => cell === 'expo').length,
    board.filter(cell => cell === 'you').length,
  ], [board])
  const yourTurn = !outcome && expoCount === youCount

  useEffect(() => {
    if (!outcome || countedRound.current === round) return
    countedRound.current = round
    if (outcome === 'draw') return
    setScore(current => outcome === 'you'
      ? { ...current, you: current.you + 1 }
      : { ...current, expo: current.expo + 1 })
  }, [outcome, round])

  useEffect(() => {
    if (outcome || yourTurn) return
    const timer = setTimeout(() => {
      const next = board.slice()
      next[houseMove(board)] = 'expo'
      setBoard(next)
    }, 430)
    return () => clearTimeout(timer)
  }, [board, outcome, yourTurn])

  function play(index: number) {
    if (!yourTurn || board[index]) return
    const next = board.slice()
    next[index] = 'you'
    setBoard(next)
  }

  function reset() {
    countedRound.current = -1
    setBoard(EMPTY_BOARD)
    setRound(current => current + 1)
  }

  const status = outcome === 'you'
    ? 'You beat the house. That was not meant to be possible.'
    : outcome === 'expo'
      ? 'The house wins. It reads the whole board before you take a square.'
      : outcome === 'draw'
        ? 'A draw. Nobody gets past this board — that result is the win.'
        : yourTurn ? 'Your move. Mark your square.' : 'The house is thinking…'

  const winLine = win?.line ?? []

  return (
    <main className="notfound-page">
      <p className="legal-eyebrow">404 — FILM EXPO INDIA</p>
      <h1 className="nf-title">You lost the page.<br />You’ll lose this game, too.</h1>
      <p className="nf-score">Expo {score.expo} · You {score.you}</p>
      <p className="nf-copy">The reel you were looking for does not exist or has been moved. Until then: the house, at tic-tac-toe.</p>
      <p className="nf-hint">Every square you take, it has already answered. Hold the board to a draw and consider that a result.</p>

      <div className="nf-stage">
        <span className="nf-digit nf-digit-one" aria-hidden="true">4</span>
        <div className="nf-board" role="group" aria-label="Tic-tac-toe board">
          {board.map((cell, index) => (
            <button
              type="button"
              key={index}
              className={`nf-cell${winLine.includes(index) ? ' is-win' : ''}`}
              onClick={() => play(index)}
              disabled={!yourTurn || Boolean(cell)}
              aria-label={`Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}: ${
                cell === 'you' ? 'your mark' : cell === 'expo' ? 'expo mark' : 'empty'
              }`}
            >
              {cell === 'you'
                ? <span className="nf-mark nf-mark-you">X</span>
                : cell === 'expo'
                  ? <span className="nf-mark nf-mark-expo"><Star size={36} fill="currentColor" /></span>
                  : <span className="nf-ghost" aria-hidden="true">X</span>}
            </button>
          ))}
        </div>
        <span className="nf-digit nf-digit-two" aria-hidden="true">4</span>
      </div>

      <p className="nf-status" role="status" aria-live="polite">{status}</p>

      <div className="nf-actions">
        <button type="button" className="nf-text-button" onClick={reset}>
          [ {outcome === 'you' ? 'Run it back' : 'Lose again'} ]
        </button>
        <Link href="/" className="nf-text-button">[ Take me home ]</Link>
      </div>
    </main>
  )
}
