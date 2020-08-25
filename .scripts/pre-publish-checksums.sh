#!/bin/sh
# Computes the checksums of all of the packages locally

set -e

PACKAGES=$( ls ./packages/ )
VERSION=$( node -p "require('./package').version" )
echo "\"module\",\"shasum\""
for PACKAGE in ${PACKAGES} ; do
  cd ./packages/${PACKAGE}
  PACKAGE_SHA=$( npm pack --dry-run 2>&1 >/dev/null | grep "shasum: " | awk '{print $NF}' )
  echo "\"@rsksmart/${PACKAGE}@${VERSION}\",\"${PACKAGE_SHA}\""
  cd ../..
done
