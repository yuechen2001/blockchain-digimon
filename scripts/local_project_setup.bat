@echo off
echo Starting Digimon Blockchain Project...

REM Start hardhat node in the background
start "Hardhat Node" cmd /c "npx hardhat node"

REM Wait a moment for node to start
timeout /t 5

REM Deploy contracts
echo Running deployContract.js...
call npx hardhat run scripts\deployContract.js --network localhost
if %ERRORLEVEL% NEQ 0 (
    echo Error: Contract deployment failed!
    pause
    exit /b 1
)

REM List stored Digimons and ensure it completes
echo Running listStoredDigimons.js...
call npx hardhat run scripts\listStoredDigimons.js --network localhost
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to list stored Digimons!
    pause
    exit /b 1
)
echo List Digimons script completed successfully.