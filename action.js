const core = require('@actions/core');
const exec = require('@actions/exec');
const slack = require('@slack/webhook');

const webhook = new slack.IncomingWebhook(core.getInput('webhook'));
const jobStatus = core.getInput('job-status');
const customText = core.getInput('text');

async function run() {
    try {
        const workflow = process.env.GITHUB_WORKFLOW;
        const runNumber = process.env.GITHUB_RUN_NUMBER;
        const repository = process.env.GITHUB_REPOSITORY;
        const repositoryUrl = `https://github.com/${repository}`;
        const branch = await execute('git rev-parse --abbrev-ref HEAD');
        const branchUrl = `${repositoryUrl}/commits/${branch}`;
        const commit = await execute('git rev-parse --short HEAD');
        const commitUrl = `${repositoryUrl}/commit/${commit}`;
        const commitMessage = await execute('git show -s --format=%s HEAD');
        const commitAuthor = await execute('git show -s --format=%an HEAD');
        const runId = process.env.GITHUB_RUN_ID;
        const runUrl = `${repositoryUrl}/actions/runs/${runId}`;

        await webhook.send({
            text: customText,
            attachments: [{
                color: jobStatus == 'success' ? 'good' : jobStatus == 'failure' ? 'danger' : 'warning',
                text: link(repository, repositoryUrl) + ' • ' +
                      link(`${workflow} • run ${runNumber} • ${jobStatus}`, runUrl),
                fields: [
                    field('Branch', link(branch, branchUrl)),
                    field('Commit', link(commit, commitUrl)),
                    field('Message', commitMessage),
                    field('Author', commitAuthor)
                ]
            }]
        });
    } catch (error) {
        core.setFailed(error.message);
    }
}

function link(text, url) {
    return `<${url}|${text}>`;
}

function field(title, value) {
    return {
        title: title,
        value: value,
        short: true
    };
}

async function execute(command, env = {}) {
    var output = "";
    if (await exec.exec(command, [],
                        {
                            env: Object.assign({}, env, process.env),
                            listeners: {
                                stdout: data => { output += data.toString(); }
                            }
                        }) != 0) {
        core.error(`${command} failed with non-zero exit code.`)
        throw `${command} failed with non-zero exit code.`;
    }
    return output.trim();
}

run();
