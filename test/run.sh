#!/bin/bash

set -euo pipefail

TEST_DIR=$(dirname ${BASH_SOURCE[0]})
ROOT_DIR=$(dirname $TEST_DIR)
TEST_OUTPUT_DIR="${TEST_DIR}/dist"

rm -rf $TEST_OUTPUT_DIR
mkdir -p $TEST_OUTPUT_DIR
protoc \
  -I=$TEST_DIR \
  --plugin="protoc-gen-grpc-js=${ROOT_DIR}/bin/protoc-gen-grpc-js.js" \
  --js_out="import_style=commonjs,binary:${TEST_OUTPUT_DIR}" \
  --grpc-js_out="grpc_js:${TEST_OUTPUT_DIR}" \
  ${TEST_DIR}/*.proto
