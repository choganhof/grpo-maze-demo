import { useEffect, useState } from 'react'
import LearningOverTime from './components/LearningOverTime.jsx'
import { getExperimentDataCounts, loadExperimentData } from './data/experimentData.js'
import './App.css'

const modes = [
  {
    number: '01',
    title: 'Mode 1: Learning Over Time',
    description:
      'Follow how a CNN policy improves as it practices navigating a collection of 5×5 mazes.',
    detail: 'A view of training progress, from early attempts to a stronger policy.',
  },
  {
    number: '02',
    title: 'Mode 2: Inside a GRPO Update',
    description:
      'Step inside one Group Relative Policy Optimization update and see how a group of attempts guides learning.',
    detail: 'A closer look at sampled paths, relative rewards, and a policy update.',
  },
]

function App() {
  const [dataStatus, setDataStatus] = useState({ state: 'loading' })

  useEffect(() => {
    let isActive = true

    loadExperimentData()
      .then((data) => {
        if (isActive) {
          setDataStatus({
            state: 'ready',
            data,
            counts: getExperimentDataCounts(data),
          })
        }
      })
      .catch((error) => {
        if (isActive) {
          setDataStatus({
            state: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="GRPO Maze Learning Explorer home">
          <span className="wordmark-mark" aria-hidden="true">
            G
          </span>
          <span>LEARNING LAB</span>
        </a>
        <span className="topbar-note">An interactive guide to reinforcement learning</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">POLICY LEARNING, MADE VISIBLE</p>
        <h1 id="page-title">GRPO Maze Learning Explorer</h1>
        <p className="intro-copy">
          Discover how a convolutional neural network can learn to navigate
          small mazes with Group Relative Policy Optimization.
        </p>
        <div className="topic-pills" aria-label="Demonstration topics">
          <span>5 × 5 mazes</span>
          <span>CNN policy</span>
          <span>GRPO</span>
        </div>
      </section>

      {dataStatus.state === 'ready' && dataStatus.data && (
        <LearningOverTime data={dataStatus.data} />
      )}

      <section className="modes" aria-labelledby="modes-title">
        <div className="section-heading">
          <p className="eyebrow">CHOOSE A PERSPECTIVE</p>
          <h2 id="modes-title">Two ways to explore</h2>
        </div>

        <div className="mode-grid">
          {modes.map((mode) => (
            <article className="mode-card" key={mode.number}>
              <div className="mode-card-top">
                <span className="mode-number">{mode.number}</span>
                <span className="mode-label">LEARNING MODE</span>
              </div>
              <h3>{mode.title}</h3>
              <p className="mode-description">{mode.description}</p>
              <div className="mode-divider" />
              <p className="mode-detail">{mode.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="data-status" aria-labelledby="data-status-title">
        <div className="section-heading">
          <p className="eyebrow">EXPERIMENTAL DATA</p>
          <h2 id="data-status-title">Data status</h2>
        </div>

        {dataStatus.state === 'loading' && (
          <p className="data-message" role="status">
            Loading experimental data…
          </p>
        )}
        {dataStatus.state === 'error' && (
          <p className="data-message data-message-error" role="alert">
            Unable to load experimental data. {dataStatus.message} Check that the files are in
            <code>public/data/</code> and reload the page.
          </p>
        )}
        {dataStatus.state === 'ready' && (
          <dl className="data-metrics">
            {dataStatus.counts.map(({ label, value }) => (
              <div className="data-metric" key={label}>
                <dt>{label}</dt>
                <dd>{value.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <footer className="page-footer">
        <span>Reinforcement learning, one decision at a time.</span>
        <span>GRPO · MAZE NAVIGATION</span>
      </footer>
    </main>
  )
}

export default App
