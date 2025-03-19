#!/usr/bin/env python3
"""
Setup script for PLUTO Data Loader
This script helps set up the environment for the PLUTO Data Loader.
It installs required dependencies and creates a configuration file.
"""

import os
import sys
import subprocess
import json
import getpass
from pathlib import Path

# Required Python packages
REQUIRED_PACKAGES = [
    "requests",
    "pandas",
    "psycopg2-binary",
    "tqdm"
]

# Configuration template
CONFIG_TEMPLATE = {
    "SUPABASE_DB_HOST": "",
    "SUPABASE_DB_PORT": "5432",
    "SUPABASE_DB_NAME": "",
    "SUPABASE_DB_USER": "",
    "SUPABASE_DB_PASSWORD": ""
}

def check_python_version():
    """Check that Python version is 3.7 or higher."""
    major, minor = sys.version_info[:2]
    if major < 3 or (major == 3 and minor < 7):
        print("Error: Python 3.7 or higher is required.")
        sys.exit(1)

def install_dependencies():
    """Install required Python packages."""
    print("Installing required dependencies...")
    for package in REQUIRED_PACKAGES:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"  ✅ {package} installed successfully")
        except subprocess.CalledProcessError:
            print(f"  ❌ Failed to install {package}")
            return False
    return True

def create_env_file(filename=".env"):
    """Create a .env file with Supabase database connection details."""
    env_path = Path(filename)
    
    if env_path.exists():
        print(f"A configuration file ({filename}) already exists.")
        overwrite = input("Do you want to overwrite it? (y/n): ")
        if overwrite.lower() != 'y':
            print("Keeping existing configuration file.")
            return
    
    print("\nPlease enter your Supabase database connection details:")
    config = CONFIG_TEMPLATE.copy()
    
    # Get database connection details from user
    config["SUPABASE_DB_HOST"] = input("Database Host (e.g., db.abcdefghijkl.supabase.co): ")
    config["SUPABASE_DB_NAME"] = input("Database Name (e.g., postgres): ") or "postgres"
    config["SUPABASE_DB_USER"] = input("Database User (e.g., postgres): ") or "postgres"
    config["SUPABASE_DB_PASSWORD"] = getpass.getpass("Database Password: ")
    
    # Write config to .env file
    with open(env_path, "w") as env_file:
        for key, value in config.items():
            env_file.write(f"{key}={value}\n")
    
    print(f"\nConfiguration saved to {filename}")
    print("You can now run the PLUTO loader script.")

def create_run_script():
    """Create a shell script to run the PLUTO loader with environment variables."""
    script_content = """#!/bin/bash
# Load environment variables
set -a
source .env
set +a

# Run the PLUTO loader script
python pluto_loader.py "$@"
"""
    
    with open("run_pluto_loader.sh", "w") as script_file:
        script_file.write(script_content)
    
    # Make the script executable
    os.chmod("run_pluto_loader.sh", 0o755)
    
    print("Created run_pluto_loader.sh script")

def main():
    """Main function for setup."""
    print("NYC PLUTO Data Loader - Setup\n")
    
    # Check Python version
    check_python_version()
    
    # Install dependencies
    if not install_dependencies():
        print("\nError: Failed to install some dependencies. Please fix the issues and try again.")
        sys.exit(1)
    
    print("\nDependencies installed successfully.")
    
    # Create configuration file
    create_env_file()
    
    # Create run script
    create_run_script()
    
    print("\nSetup complete! You can now run the loader using:")
    print("  ./run_pluto_loader.sh")
    print("\nFor incremental loading:")
    print("  ./run_pluto_loader.sh --incremental")
    print("\nFor loading a specific borough:")
    print("  ./run_pluto_loader.sh --borough 1  # Manhattan")
    print("  ./run_pluto_loader.sh --borough 2  # Bronx")
    print("  ./run_pluto_loader.sh --borough 3  # Brooklyn")
    print("  ./run_pluto_loader.sh --borough 4  # Queens")
    print("  ./run_pluto_loader.sh --borough 5  # Staten Island")

if __name__ == "__main__":
    main()