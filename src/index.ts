import { sleep } from './helper'
import { promises as fs } from 'fs'
import { Repo, FileList } from './model'
import { getInput } from '@actions/core'
import { getOctokit } from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'

/**
 * Return repository owner & name
 */
function getRepo(): Repo {
  const repo = process.env.REPO?.split('/')

  return {
    owner: repo[0],
    name: repo[1],
  }
}

/**
 * Return list of labes
 */
function getLabels(): string[] {
  try {
    return JSON.parse(getInput('labels'))
  } catch (error) {
    console.error(`Get labels ${error}`)
  }
}

async function getIssues(octokit: InstanceType<typeof GitHub>): Promise<string[]> {
  let page = 0
  const issues: string[] = []

  try {
    while (true) {
      const { data } = await octokit.issues.listForRepo({
        owner: getRepo().owner,
        repo: getRepo().name,
        state: 'open',
        labels: JSON.parse(getInput('labels')),
        per_page: 100,
        page,
      })

      if (!data.length) break

      issues.push(...data.map((issue) => issue.title))
      page++
    }

    return issues
  } catch (error) {
    console.error(`Get issues ${error}`)
  }
}

/**
 * Return predefined list from ASSIGNEES or randomly selected if RANDASSIGNEES env param filled
 */
function getAssignee(): string[] {
  try {
    const assignee = getInput('assignees')
    const randAssignees = getInput('randAssignees')
    let result = assignee ? JSON.parse(assignee) : [getRepo().owner]

    if (randAssignees) {
      const list = JSON.parse(randAssignees)
      result = [list[Math.floor(Math.random() * list.length)]]
    }

    return result
  } catch (error) {
    console.error(`Get assignee ${error}`)
  }
}

/**
 * Create MAX issues for stale docs with PREFIX and BODY
 */
async function createIssues(token: string, files: FileList): Promise<void> {
  let created = 0
  const BODY = getInput('body')
  const PREFIX = getInput('prefix')
  const MAX = parseInt(getInput('max'))
  const octokit = getOctokit(token)
  const issues = await getIssues(octokit)

  for (const file of Object.keys(files)) {
    const title = `${PREFIX} ${file}`

    if (issues.find((issue) => issue === title)) continue

    await sleep(500)

    await octokit.issues
      .create({
        owner: getRepo().owner,
        repo: getRepo().name,
        title,
        body: BODY.replace('$$$', `${files[file]}`),
        assignees: getAssignee(),
        labels: getLabels(),
      })
      .catch((e) => {
        console.error(e)
        process.exit(1)
      })

    console.log(`Created issue for ${file}`)

    if (++created === MAX) {
      process.exit(0)
    }
  }
}

/**
 * Main function
 */
async function run(): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  const files = getInput('files')
  const oldFiles: FileList = JSON.parse(await fs.readFile(files, 'utf8')) || {}

  if (!token) {
    console.error(`Invalid token or no token provided: ${token}`)
    process.exit(1)
  }

  if (!Object.keys(oldFiles).length) {
    console.error('No old files found')
    process.exit(0)
  }

  await createIssues(token, oldFiles)

  console.log(`Finished: https://github.com/${process.env.REPO}/issues`)
}

try {
  run()
} catch (err) {
  console.error(err)
}
