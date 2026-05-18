#!/usr/bin/env bash
set -euo pipefail

TEST_COMMAND="${TEST_COMMAND:-echo "Add project validation command here"}"

if [[ "$TEST_COMMAND" == \<* ]]; then
  echo "Set TEST_COMMAND or update scripts/test.sh with the real validation command."
  exit 1
fi

echo "Running validation:"
echo "$TEST_COMMAND"
eval "$TEST_COMMAND"
