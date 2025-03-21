#!/bin/bash
# Load environment variables
set -a
source .env
set +a

# Run the PLUTO local CSV loader script with all arguments passed through
python pluto_local_loader.py "$@"