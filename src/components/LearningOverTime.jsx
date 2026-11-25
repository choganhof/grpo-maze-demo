import { useEffect, useMemo, useState } from 'react'
import './LearningOverTime.css'

// The visualization arrays store actions in Up, Down, Left, Right order.
const ACTIONS = [
  {
    name: 'Up',
    index: 0,
    rowOffset: -1,
    colOffset: 0,
    line: 'M42 56 L42 17',
    head: 'M34 25 L42 17 L50 25',
  },
  {
    name: 'Down',
    index: 1,
    rowOffset: 1,
    colOffset: 0,
    line: 'M58 44 L58 83',
    head: 'M50 75 L58 83 L66 75',
  },
  {
    name: 'Left',
    index: 2,
    rowOffset: 0,
    colOffset: -1,
    line: 'M56 42 L17 42',
    head: 'M25 34 L17 42 L25 50',
  },
  {
    name: 'Right',
    index: 3,
    rowOffset: 0,
    colOffset: 1,
    line: 'M44 58 L83 58',
    head: 'M75 50 L83 58 L75 66',
  },
]

const PANEL_COPY = {
  policy: {
    number: '01',
    title: 'CNN Policy',
    description: 'Recorded legal-action probabilities at every open, non-goal cell.',
  },
  changes: {
    number: '02',
    title: 'Changes in the CNN Policy',
    description: 'Recorded action-probability changes from the previous checkpoint.',
  },
  trajectory: {
    number: '03',
    title: 'Greedy Navigation',
    description: 'The greedy trajectory recorded for this maze and checkpoint.',
  },
}

function getLegalActions(grid, row, col) {
  return ACTIONS.filter(({ rowOffset, colOffset }) => {
    const nextRow = row + rowOffset
    const nextCol = col + colOffset
    return grid[nextRow]?.[nextCol] === '.'
  })
}

function validateVisualization(maze, record) {
  if (!Array.isArray(maze.grid) || maze.grid.length !== 5 || maze.grid.some((row) => row.length !== 5)) {
    return `The maze data for ${maze.label} is not a 5×5 grid.`
  }

  if (!record || !record.probabilities || !record.trajectory) {
    return `The visualization record for ${maze.label} is incomplete.`
  }

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      if (maze.grid[row][col] !== '.' || (row === maze.goal[0] && col === maze.goal[1])) {
        continue
      }

      const key = `${row},${col}`
      const probabilityVector = record.probabilities[key]
      if (
        !Array.isArray(probabilityVector) ||
        probabilityVector.length !== ACTIONS.length ||
        probabilityVector.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
      ) {
        return `The policy probabilities are missing or invalid at row ${row + 1}, column ${col + 1}.`
      }

      if (record.probability_changes !== null) {
        const changeVector = record.probability_changes?.[key]
        if (
          !Array.isArray(changeVector) ||
          changeVector.length !== ACTIONS.length ||
          changeVector.some((value) => !Number.isFinite(value))
        ) {
          return `The policy changes are missing or invalid at row ${row + 1}, column ${col + 1}.`
        }
      }
    }
  }

  if (!Array.isArray(record.trajectory.path) || record.trajectory.path.length === 0) {
    return `The recorded trajectory for ${maze.label} is missing its path.`
  }

  return null
}

function Arrow({ action, value, kind, maxChange, onTooltipChange }) {
  if (kind === 'changes' && value === 0) {
    return null
  }

  const isChange = kind === 'changes'
  const color = isChange ? (value > 0 ? '#27845b' : '#c6534a') : '#237b73'
  const strokeWidth = isChange
    ? 0.8 + (Math.abs(value) / maxChange) * 3.4
    : 1 + value * 4
  const tooltip = isChange
    ? `${action.name}: ${value > 0 ? '+' : ''}${value.toFixed(4)}`
    : `${action.name}: ${value.toFixed(4)}`

  return (
    <g
      className="maze-action-arrow"
      role="img"
      aria-label={tooltip}
      tabIndex={0}
      key={action.name}
      onBlur={() => onTooltipChange(null)}
      onFocus={() => onTooltipChange(tooltip)}
      onMouseEnter={() => onTooltipChange(tooltip)}
      onMouseLeave={() => onTooltipChange(null)}
    >
      <path d={action.line} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <path d={action.head} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </g>
  )
}

function ArrowLayer({ maze, record, row, col, kind, maxChange }) {
  const [tooltip, setTooltip] = useState(null)

  if (kind === 'changes' && record.probability_changes === null) {
    return null
  }

  const key = `${row},${col}`
  const values =
    kind === 'policy' ? record.probabilities[key] : record.probability_changes[key]
  const legalActions = getLegalActions(maze.grid, row, col)

  return (
    <div className={`maze-arrow-layer${tooltip ? ' has-tooltip' : ''}`}>
      <svg
        className="maze-action-arrows"
        viewBox="0 0 100 100"
        aria-label={`Legal action probabilities at row ${row + 1}, column ${col + 1}`}
      >
        {legalActions.map((action) => (
          <Arrow
            action={action}
            kind={kind}
            key={action.name}
            maxChange={maxChange}
            onTooltipChange={setTooltip}
            value={values[action.index]}
          />
        ))}
      </svg>
      {tooltip && (
        <span className="maze-arrow-tooltip" role="tooltip">
          {tooltip}
        </span>
      )}
    </div>
  )
}

function TrajectoryOverlay({ path }) {
  const points = path.map(([row, col]) => `${col * 100 + 50},${row * 100 + 50}`).join(' ')
  const markerId = 'greedy-trajectory-arrowhead'
  const color = '#237b73'

  return (
    <svg className="trajectory-overlay" viewBox="0 0 500 500" aria-hidden="true">
      <defs>
        <marker
          id={markerId}
          markerHeight="10"
          markerUnits="userSpaceOnUse"
          markerWidth="10"
          orient="auto"
          refX="8"
          refY="5"
          viewBox="0 0 10 10"
        >
          <path d="M0 0 L10 5 L0 10 Z" fill={color} />
        </marker>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <polyline
        points={points}
        fill="none"
        markerEnd={`url(#${markerId})`}
        markerMid={`url(#${markerId})`}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
    </svg>
  )
}

function MazePanel({ kind, maze, record, checkpoint, validationError, globalMaxChange }) {
  const copy = PANEL_COPY[kind]
  const isInitialCheckpoint = record.probability_changes === null
  const hasChanges =
    record.probability_changes !== null &&
    Object.values(record.probability_changes).some((values) =>
      values.some((value) => value !== 0),
    )
  const pathCells = new Set(record.trajectory.path.map(([row, col]) => `${row},${col}`))

  return (
    <article className={`maze-panel maze-panel-${kind}`}>
      <header className="maze-panel-heading">
        <div className="maze-panel-title">
          <span className="maze-panel-number">{copy.number}</span>
          <div>
            <h3>{copy.title}</h3>
            <p>{copy.description}</p>
          </div>
        </div>
        <span className="maze-panel-context">
          {maze.label} · Checkpoint {checkpoint.checkpoint_index + 1}
        </span>
      </header>

      <div className="maze-panel-note-slot">
        {kind === 'changes' && isInitialCheckpoint && (
          <p className="maze-panel-notice">No previous checkpoint exists.</p>
        )}
        {kind === 'changes' && !isInitialCheckpoint && !hasChanges && (
          <p className="maze-panel-notice">No probability changes are recorded.</p>
        )}
      </div>

      {validationError ? (
        <p className="maze-panel-error" role="alert">
          {validationError}
        </p>
      ) : (
        <div className="maze-board" role="group" aria-label={`${maze.label}, 5 by 5 maze`}>
          <div className="maze-grid">
            {maze.grid.map((gridRow, row) =>
              [...gridRow].map((cell, col) => {
                const key = `${row},${col}`
                const isWall = cell === '#'
                const isStart = row === maze.start[0] && col === maze.start[1]
                const isGoal = row === maze.goal[0] && col === maze.goal[1]
                const isVisited = pathCells.has(key)
                const cellDescription = isWall
                  ? 'wall'
                  : isStart
                    ? 'start'
                    : isGoal
                      ? 'goal'
                      : 'open cell'

                return (
                  <div
                    className={[
                      'maze-cell',
                      isWall && 'is-wall',
                      isStart && 'is-start',
                      isGoal && 'is-goal',
                      kind === 'trajectory' && isVisited && 'is-visited',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={key}
                    role="group"
                    aria-label={`Row ${row + 1}, column ${col + 1}: ${cellDescription}`}
                  >
                    {!isWall && !isGoal && !validationError && kind !== 'trajectory' && (
                      <ArrowLayer
                        kind={kind}
                        maxChange={globalMaxChange}
                        maze={maze}
                        record={record}
                        row={row}
                        col={col}
                      />
                    )}
                    {isStart && <span className="maze-marker">S</span>}
                    {isGoal && <span className="maze-marker">G</span>}
                  </div>
                )
              }),
            )}
          </div>
          {kind === 'trajectory' && (
            <TrajectoryOverlay path={record.trajectory.path} />
          )}
        </div>
      )}

      {kind === 'trajectory' && !validationError && (
        <div className="trajectory-summary">
          <span
            className={`trajectory-result ${
              record.trajectory.success ? 'is-success' : 'is-failure'
            }`}
          >
            {record.trajectory.success ? 'Succeeded' : 'Failed'}
          </span>
          <span>{record.trajectory.steps} steps recorded</span>
        </div>
      )}

      <div className={`maze-panel-legend maze-panel-legend-${kind}`}>
        <span className="maze-key-item">
          <span className="maze-key-marker is-start">S</span>
          Start
        </span>
        <span className="maze-key-item">
          <span className="maze-key-marker is-goal">G</span>
          Goal
        </span>
        {kind === 'policy' && <span>Arrow thickness ∝ probability · hover for values</span>}
        {kind === 'changes' && (
          <>
            <span className="change-key is-increase">↑ Increased</span>
            <span className="change-key is-decrease">↓ Decreased</span>
            <span>Thickness uses one scale across checkpoints</span>
          </>
        )}
        {kind === 'trajectory' && (
          <span className="trajectory-key">
            <span aria-hidden="true" />
            Recorded greedy path
          </span>
        )}
      </div>
    </article>
  )
}

function getGlobalMaxChange(records) {
  let maxChange = 0

  for (const record of records) {
    if (record.probability_changes === null) {
      continue
    }

    for (const values of Object.values(record.probability_changes)) {
      for (const value of values) {
        maxChange = Math.max(maxChange, Math.abs(value))
      }
    }
  }

  return maxChange
}

function TrainingProgressGraph({ checkpoints, currentCheckpointIndex }) {
  const width = 760
  const height = 250
  const plotLeft = 48
  const plotRight = 738
  const plotTop = 20
  const plotBottom = 195
  const plotX = (index) =>
    plotLeft + (index / Math.max(checkpoints.length - 1, 1)) * (plotRight - plotLeft)
  const plotY = (success) => plotBottom - success * (plotBottom - plotTop)
  const points = checkpoints
    .map((checkpoint, index) => `${plotX(index)},${plotY(checkpoint.success)}`)
    .join(' ')
  const currentIndex = checkpoints.findIndex(
    (checkpoint) => checkpoint.checkpoint_index === currentCheckpointIndex,
  )

  if (currentIndex === -1) {
    return (
      <p className="maze-panel-error" role="alert">
        No training-success value is available for the selected checkpoint.
      </p>
    )
  }

  const currentCheckpoint = checkpoints[currentIndex]
  const markerX = plotX(currentIndex)
  const markerY = plotY(currentCheckpoint.success)
  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  const xTicks = [0, 11, 23, 35, 47].filter((index) => index < checkpoints.length)

  return (
    <section className="training-progress" aria-labelledby="training-progress-title">
      <header className="training-progress-heading">
        <div>
          <p className="eyebrow">RECORDED TRAINING DATA</p>
          <h3 id="training-progress-title">Training success over time</h3>
        </div>
        <p className="training-progress-current">
          Checkpoint {currentCheckpoint.checkpoint_index + 1}
          <span>· {(currentCheckpoint.success * 100).toFixed(1)}% success</span>
        </p>
      </header>

      <div className="training-chart-scroll">
        <svg
          className="training-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Training success for ${checkpoints.length} recorded checkpoints. Current checkpoint ${currentCheckpoint.checkpoint_index + 1}: ${(currentCheckpoint.success * 100).toFixed(1)} percent.`}
        >
          <title>Recorded training-success values across all checkpoints</title>
          {yTicks.map((tick) => {
            const y = plotY(tick)
            return (
              <g className="training-chart-gridline" key={tick}>
                <line x1={plotLeft} x2={plotRight} y1={y} y2={y} />
                <text x={plotLeft - 10} y={y + 4} textAnchor="end">
                  {Math.round(tick * 100)}%
                </text>
              </g>
            )
          })}
          <polyline className="training-chart-series" points={points} />
          <line
            className="training-chart-marker-line"
            x1={markerX}
            x2={markerX}
            y1={plotTop}
            y2={plotBottom}
          />
          <circle className="training-chart-marker" cx={markerX} cy={markerY} r="7">
            <title>
              Checkpoint {currentCheckpoint.checkpoint_index + 1}:{' '}
              {(currentCheckpoint.success * 100).toFixed(1)}% success
            </title>
          </circle>
          {xTicks.map((index) => (
            <text
              className="training-chart-x-label"
              key={index}
              textAnchor="middle"
              x={plotX(index)}
              y={plotBottom + 20}
            >
              {checkpoints[index].checkpoint_index + 1}
            </text>
          ))}
          <text
            className="training-chart-axis-title"
            textAnchor="middle"
            x={(plotLeft + plotRight) / 2}
            y={height - 5}
          >
            Training checkpoint
          </text>
        </svg>
      </div>
    </section>
  )
}

export default function LearningOverTime({ data }) {
  const [mazeIndex, setMazeIndex] = useState(0)
  const [checkpointIndex, setCheckpointIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const mazes = [...data.mazeDefinitions].sort((a, b) => a.maze_index - b.maze_index)
  const checkpoints = [...data.trainingProgress].sort(
    (a, b) => a.checkpoint_index - b.checkpoint_index,
  )
  const firstCheckpointIndex = checkpoints[0].checkpoint_index
  const lastCheckpointIndex = checkpoints[checkpoints.length - 1].checkpoint_index
  const globalMaxChange = useMemo(
    () => getGlobalMaxChange(data.visualizationRecords),
    [data.visualizationRecords],
  )
  const isAtFirstCheckpoint = checkpointIndex === firstCheckpointIndex
  const isAtLastCheckpoint = checkpointIndex === lastCheckpointIndex

  useEffect(() => {
    if (!isPlaying || checkpointIndex >= lastCheckpointIndex) {
      return undefined
    }

    const timer = setTimeout(() => {
      const nextIndex = Math.min(checkpointIndex + 1, lastCheckpointIndex)
      setCheckpointIndex(nextIndex)
      if (nextIndex === lastCheckpointIndex) {
        setIsPlaying(false)
      }
    }, 1000 / speed)

    return () => clearTimeout(timer)
  }, [checkpointIndex, isPlaying, lastCheckpointIndex, speed])

  const maze = mazes.find((item) => item.maze_index === mazeIndex)
  const checkpoint = checkpoints.find((item) => item.checkpoint_index === checkpointIndex)
  const record = data.visualizationRecords.find(
    (item) => item.maze_index === mazeIndex && item.checkpoint_index === checkpointIndex,
  )

  if (!maze || !checkpoint || !record) {
    return (
      <section className="learning-visualization" aria-labelledby="learning-visualization-title">
        <p className="maze-panel-error" role="alert">
          No recorded visualization is available for the selected maze and checkpoint.
        </p>
      </section>
    )
  }

  const validationError = validateVisualization(maze, record)

  return (
    <section className="learning-visualization" aria-labelledby="learning-visualization-title">
      <div className="section-heading">
        <p className="eyebrow">MODE 1 · LEARNING OVER TIME</p>
        <h2 id="learning-visualization-title">Watch the policy at work</h2>
        <p className="visualization-intro">
          Compare the recorded policy, its change from the prior checkpoint, and its greedy path.
        </p>
      </div>

      <div className="learning-controls" role="group" aria-label="Visualization controls">
        <label className="learning-select maze-select">
          <span>Maze</span>
          <select
            aria-label="Maze"
            value={mazeIndex}
            onChange={(event) => setMazeIndex(Number(event.target.value))}
          >
            {mazes.map((item) => (
              <option key={item.maze_index} value={item.maze_index}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="learning-select checkpoint-select">
          <span>Training checkpoint</span>
          <select
            aria-label="Training checkpoint"
            value={checkpointIndex}
            onChange={(event) => {
              setIsPlaying(false)
              setCheckpointIndex(Number(event.target.value))
            }}
          >
            {checkpoints.map((item) => (
              <option key={item.checkpoint_index} value={item.checkpoint_index}>
                Checkpoint {item.checkpoint_index + 1} · Stage {item.stage} · Group{' '}
                {item.cumulative_group.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <button
          className="playback-button"
          type="button"
          disabled={isAtFirstCheckpoint}
          onClick={() => {
            setIsPlaying(false)
            setCheckpointIndex((currentIndex) => Math.max(currentIndex - 1, firstCheckpointIndex))
          }}
        >
          Step Back
        </button>
        <button
          className="playback-button"
          type="button"
          disabled={isAtLastCheckpoint}
          onClick={() => {
            setIsPlaying(false)
            setCheckpointIndex((currentIndex) => Math.min(currentIndex + 1, lastCheckpointIndex))
          }}
        >
          Step Forward
        </button>
        <button
          className="playback-button playback-button-primary"
          type="button"
          aria-label={isPlaying ? 'Pause playback' : 'Run playback'}
          disabled={!isPlaying && isAtLastCheckpoint}
          onClick={() => setIsPlaying((playing) => !playing)}
        >
          {isPlaying ? 'Pause' : 'Run'}
        </button>
        <button
          className="playback-button"
          type="button"
          onClick={() => {
            setIsPlaying(false)
            setCheckpointIndex(firstCheckpointIndex)
          }}
        >
          Reset
        </button>
        <label className="learning-select speed-select">
          <span>Speed</span>
          <select
            aria-label="Speed"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
            <option value="4">4×</option>
          </select>
        </label>
      </div>

      {validationError ? (
        <p className="maze-panel-error selection-error" role="alert">
          {validationError}
        </p>
      ) : (
        <div className="maze-panel-grid">
          <MazePanel
            checkpoint={checkpoint}
            globalMaxChange={globalMaxChange}
            kind="policy"
            maze={maze}
            record={record}
            validationError={validationError}
          />
          <MazePanel
            checkpoint={checkpoint}
            globalMaxChange={globalMaxChange}
            kind="changes"
            maze={maze}
            record={record}
            validationError={validationError}
          />
          <MazePanel
            checkpoint={checkpoint}
            globalMaxChange={globalMaxChange}
            kind="trajectory"
            maze={maze}
            record={record}
            validationError={validationError}
          />
        </div>
      )}
      <TrainingProgressGraph
        checkpoints={checkpoints}
        currentCheckpointIndex={checkpointIndex}
      />
    </section>
  )
}
