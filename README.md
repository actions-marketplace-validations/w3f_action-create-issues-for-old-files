# Create issues for stale docs
This action takes a list of outdated files and creates issues for each of them. You can set max. count of issues to create per one run. 

## Input
* `files` — Path to JSON with stale files, see below
* `prefix` — Issue title prefix, default is `[STALE]`
* `body` - Issue message body, default `Last edit happened $$$ days ago 😬`, where `$$$` will be replaced with file age
* `labels` - Issue labels, JSON string, default is `['docs', 'stale']`
* `assignees` — Issue assignees, JSON string, default is repo owner
* `randAssignees` - Issue assignees, pick one at random, JSON string, overrides previous option
* `max` — Max count of issues to create per one run

**Input file format**  
JSON, where `key` is a path to file and `value` is age since last commit.
```
{
  "path/to/file.md": 21,
  ...
}
```