
# Clowder

Clowder is a decentralized application (dApp) for creating and managing CAT (Custom Asset Tokens) using MetaMask and Web3. This project allows users to connect their MetaMask wallet, create new CATs, and interact with existing CATs.

## Features

- Connect to MetaMask wallet
- Create new CATs
- View details of existing CATs
- Owner actions for managing CATs

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/clowder.git
   cd clowder

2. Install dependencies:
   ```sh 
    npm install

3. Start the development server:
    ```sh
    npm run dev

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- Next.js
- TailwindCSS
- ShadCN UI
- Web3.js
- Solidity

## Usage

### Connecting to MetaMask

1. Open the application in your browser.
2. Click on the "Connect Wallet" button to connect your MetaMask wallet.

### Creating a CAT

1. Navigate to the "Create CAT" page.
2. Fill in the form with the required details (Maximum Supply, Threshold Supply, Maximum Expansion Rate).
3. Click on the "Deploy CAT" button to create a new CAT.

### Viewing CAT Details

1. Navigate to the CAT details page by entering the CAT address in the input field on the home page.
2. View the details of the CAT and perform owner actions if you are the owner.