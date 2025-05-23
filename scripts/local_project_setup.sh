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

# Deploy contracts using the new deploy.cjs script
echo "Running deploy.cjs..."
npx hardhat run scripts/deploy.cjs --network localhost
if [ $? -ne 0 ]; then
    echo "Error: Contract deployment failed!"
    exit 1
fi

echo "Setup completed! The Hardhat node is running in the separate terminal window."
echo "When finished, close the terminal window running the Hardhat node or press Ctrl+C in that window."