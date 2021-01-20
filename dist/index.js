"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const helper_1 = require("./helper");
const fs_1 = require("fs");
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
/**
 * Return repository owner & name
 */
function getRepo() {
    var _a;
    const repo = (_a = process.env.REPO) === null || _a === void 0 ? void 0 : _a.split('/');
    return {
        owner: repo[0],
        name: repo[1],
    };
}
/**
 * Return list of labes
 */
function getLabels() {
    try {
        return JSON.parse(core_1.getInput('labels'));
    }
    catch (error) {
        console.error(`Get labels ${error}`);
    }
}
function getIssues(octokit) {
    return __awaiter(this, void 0, void 0, function* () {
        let page = 0;
        const issues = [];
        try {
            while (true) {
                const { data } = yield octokit.issues.listForRepo({
                    owner: getRepo().owner,
                    repo: getRepo().name,
                    state: 'open',
                    labels: JSON.parse(core_1.getInput('labels')),
                    per_page: 100,
                    page,
                });
                if (!data.length)
                    break;
                issues.push(...data.map((issue) => issue.title));
                page++;
            }
            return issues;
        }
        catch (error) {
            console.error(`Get issues ${error}`);
        }
    });
}
/**
 * Return predefined list from ASSIGNEES or randomly selected if RANDASSIGNEES env param filled
 */
function getAssignee() {
    try {
        const assignee = core_1.getInput('assignees');
        const randAssignees = core_1.getInput('randAssignees');
        let result = assignee ? JSON.parse(assignee) : [getRepo().owner];
        if (randAssignees) {
            const list = JSON.parse(randAssignees);
            result = [list[Math.floor(Math.random() * list.length)]];
        }
        return result;
    }
    catch (error) {
        console.error(`Get assignee ${error}`);
    }
}
/**
 * Create MAX issues for stale docs with PREFIX and BODY
 */
function createIssues(token, files) {
    return __awaiter(this, void 0, void 0, function* () {
        let created = 0;
        const BODY = core_1.getInput('body');
        const PREFIX = core_1.getInput('prefix');
        const MAX = parseInt(core_1.getInput('max'));
        const octokit = github_1.getOctokit(token);
        const issues = yield getIssues(octokit);
        for (const file of Object.keys(files)) {
            const title = `${PREFIX} ${file}`;
            if (issues.find((issue) => issue === title))
                continue;
            yield helper_1.sleep(500);
            yield octokit.issues
                .create({
                owner: getRepo().owner,
                repo: getRepo().name,
                title,
                body: BODY.replace('$$$', `${files[file]}`),
                assignees: getAssignee(),
                labels: getLabels(),
            })
                .catch((e) => {
                console.error(e);
                process.exit(1);
            });
            console.log(`Created issue for ${file}`);
            if (++created === MAX) {
                process.exit(0);
            }
        }
    });
}
/**
 * Main function
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = process.env.GITHUB_TOKEN;
        const files = core_1.getInput('files');
        const oldFiles = JSON.parse(yield fs_1.promises.readFile(files, 'utf8')) || {};
        if (!token) {
            console.error(`Invalid token or no token provided: ${token}`);
            process.exit(1);
        }
        if (!Object.keys(oldFiles).length) {
            console.error('No old files found');
            process.exit(0);
        }
        yield createIssues(token, oldFiles);
        console.log(`Finished: https://github.com/${process.env.REPO}/issues`);
    });
}
try {
    run();
}
catch (err) {
    console.error(err);
}
