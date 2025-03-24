#!/bin/bash
echo "Starting Digimon Blockchain Project..."

# Get the current directory to use in the new terminal
CURRENT_DIR=$(pwd)

# Open a new terminal window for the Hardhat node
osascript -e "tell app \"Terminal\"
    do script \"cd $CURRENT_DIR && echo 'Starting Hardhat Node...' && npx hardhat node\"
    set position of front window to {100, 100}
    set custom title of front window to \"Hardhat Node\"
end tell"

# Wait a moment for node to start
echo "Waiting for Hardhat node to start..."
sleep 5

# Deploy contracts
echo "Running deployContract.js..."
npx hardhat run scripts/deployContract.js --network localhost
if [ $? -ne 0 ]; then
    echo "Error: Contract deployment failed!"
    exit 1
fi

# List stored Digimons and ensure it completes
echo "Running listStoredDigimons.js..."
npx hardhat run scripts/listStoredDigimons.js --network localhost
if [ $? -ne 0 ]; then
    echo "Error: Failed to list stored Digimons!"
    exit 1
fi
echo "List Digimons script completed successfully."

echo "Setup completed! The Hardhat node is running in the separate terminal window."
echo "When finished, close the terminal window running the Hardhat node or press Ctrl+C in that window."