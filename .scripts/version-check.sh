#!/bin/sh
# Prior before using lerna to bump the version numbers,
# make sure that the main package and all of the lerna packages match versions

set -e

PACKAGES=$( ls ./packages/ )
VERSION=$( node -p "require('./lerna.json').version" )
NPM_VERSION=$( node -p "require('./package.json').version" )
if [ "${VERSION}" != "${NPM_VERSION}" ] ; then
  echo "lerna version is ${VERSION}, but npm version is ${NPM_VERSION}"
  exit 1
fi
for PACKAGE in ${PACKAGES} ; do
  PACKAGE_VERSION=$( node -p "require('./packages/${PACKAGE}/package.json').version" )
  if [ "${VERSION}" != "${PACKAGE_VERSION}" ] ; then
    echo "${PACKAGE} - expected version to be ${VERSION}, but found ${PACKAGE_VERSION}"
    exit 1
  fi
done
