const base = import.meta.env.BASE_URL

const dataFiles = Object.freeze({
  visualizationRecords: `${base}data/grpo_maze_visualization_data_20.json`,
  mazeDefinitions: `${base}data/grpo_maze_definitions_20.json`,
  trainingProgress: `${base}data/grpo_maze_training_progress.json`,
  singleUpdateTrajectories: `${base}data/grpo_single_update_trajectories.json`,
  singleUpdateProbabilities: `${base}data/grpo_single_update_probabilities.json`,
})


let experimentDataPromise

async function fetchJson(url) {
  let response

  try {
    response = await fetch(url)
  } catch (error) {
    const reason = error instanceof Error ? ` (${error.message})` : ''
    throw new Error(`Network error while loading ${url}${reason}.`, { cause: error })
  }

  if (!response.ok) {
    const status = `${response.status} ${response.statusText}`.trim()
    throw new Error(`Failed to load ${url}: HTTP ${status}.`)
  }

  try {
    return await response.json()
  } catch (error) {
    const reason = error instanceof Error ? ` (${error.message})` : ''
    throw new Error(`Invalid JSON in ${url}${reason}.`, { cause: error })
  }
}

export function loadExperimentData() {
  if (!experimentDataPromise) {
    experimentDataPromise = Promise.all(
      Object.entries(dataFiles).map(async ([name, url]) => [name, await fetchJson(url)]),
    )
      .then(Object.fromEntries)
      .catch((error) => {
        experimentDataPromise = undefined
        throw error
      })
  }

  return experimentDataPromise
}

function arrayLength(value, label, url) {
  if (!Array.isArray(value)) {
    throw new Error(`Unexpected data structure in ${url}: expected ${label} to be an array.`)
  }

  return value.length
}

export function getExperimentDataCounts(data) {
  return [
    {
      label: 'Training checkpoints',
      value: arrayLength(
        data?.trainingProgress,
        'training checkpoints',
        dataFiles.trainingProgress,
      ),
    },
    {
      label: 'Available mazes',
      value: arrayLength(
        data?.mazeDefinitions,
        'maze definitions',
        dataFiles.mazeDefinitions,
      ),
    },
    {
      label: 'Mode 1 visualization records',
      value: arrayLength(
        data?.visualizationRecords,
        'visualization records',
        dataFiles.visualizationRecords,
      ),
    },
    {
      label: 'Mode 2 sampled trajectories',
      value: arrayLength(
        data?.singleUpdateTrajectories?.trajectories,
        'sampled trajectories',
        dataFiles.singleUpdateTrajectories,
      ),
    },
    {
      label: 'Mode 2 cells with before/after probabilities',
      value: arrayLength(
        data?.singleUpdateProbabilities?.cells,
        'probability cells',
        dataFiles.singleUpdateProbabilities,
      ),
    },
  ]
}
