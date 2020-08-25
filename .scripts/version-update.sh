#!/bin/sh
# After lerna updates its version and that of all the packages,
# update version in main package to match.

set -e

PACKAGES=$( ls ./packages/ )
VERSION=$( node -p "require('./lerna.json').version" )
npm version --no-git-tag-version ${VERSION}
