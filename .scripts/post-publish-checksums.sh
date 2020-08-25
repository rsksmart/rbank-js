#!/bin/sh
# Computes the checksums of all of the packages remotely (in the registry)

set -e

PACKAGES=$( ls ./packages/ )
VERSION=$( node -p "require('./package').version" )
echo "\"module\",\"shasum\""
for PACKAGE in ${PACKAGES} ; do
  PACKAGE_SHA=$( npm view @rsksmart/${PACKAGE}@${VERSION} dist.shasum )
  echo "\"@rsksmart/${PACKAGE}@${VERSION}\",\"${PACKAGE_SHA}\""
done
