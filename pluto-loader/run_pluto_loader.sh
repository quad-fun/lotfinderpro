#!/bin/bash
# Load environment variables
set -a
source .env
set +a

# Run the PLUTO loader script
python pluto_loader.py "$@"
