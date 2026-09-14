## git-journal

## git clone
The clone command you ran, and the output of listing the hidden files that proves .git exists.
Your configured name and email, from git config --list.

## git init
- Why cospace-backend sits beside clone-practice rather than inside it.

- The `git status` output showing `server.js` as untracked.

## git add
- The git status output before and after staging, and what changed.
- The difference between git add . and git add -A, in your own words.

## git commit 
- The first commit from git log, including the hash, author and message.
- Why the message is written in the imperative mood.

## git push
The output of git remote -v.
Why the GitHub repository had to be created empty.
What the -u flag did, and what you will type for future pushes.

## feature branches
git log --oneline on feat/user-schema and on main, showing the commit exists on only one.
Why work happens on a branch rather than directly on main.


## git pull

The git status output before and after git fetch, and why it changed without you editing anything.
The difference between fetch and pull.

## git main 
Your file listing on main and on feat/user-schema, showing users.js appearing and disappearing.
What Git is doing to the files on disk when you switch.

## git naming conventions
Your branch name and commit message, and why each follows the convention.
One example of a name that would fail review, and what is wrong with it.

## short lived branches
What merge debt is, in your own words.
How you would break a desk booking feature into three short-lived branches.

## create PR 
A link to your open Pull Request, and your description under Summary, What Was Done and How to Test.
What the green and red lines in the Files changed tab represent.

## review PR
The problems you found in your own db.js during self-review, most serious first.
Two problems your mentor raised, and whether you had already spotted them.
One thing you will check for automatically on your next Pull Request as a result.

## merge stratergies
git log --oneline on main after squashing, showing one clean commit.
Why the branch would not delete until you had pulled.
When you would use a merge commit rather than a squash.

## merge conflicts
The raw conflict markers as they appeared in server.js, before you resolved them.
Which version you kept and why.
Why Git needs both add and commit to finish a conflicted merge.