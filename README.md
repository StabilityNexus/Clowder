# Clowder

A minimalistic platform for creating and managing Contribution Accounting Tokens (CATs).

## Overview

Clowder enables anyone to create CATs, which are fungible tokens designed to track the value of contributions to projects within decentralized organizations. The name "Clowder" is derived from the collective noun for cats.

For more information about CATs, visit the [official documentation](https://docs.stability.nexus/about-us/the-stable-order/cats).

## CAT Token Characteristics

CATs are ERC20-compatible tokens with the following key features:

1. **Zero Initial Supply**: Tokens begin with no initial supply.
2. **Owner-Based Management**: The deployer becomes the initial owner with multi-owner support.
3. **Minting Permissions**: All owners have permission to mint new tokens.
4. **Supply Controls**:
   - Optional maximum supply cap
   - Threshold supply below which minting is unrestricted
   - Maximum supply expansion rate enforced above the threshold
5. **Governance Flexibility**: Owners can permanently reduce maximum supply, threshold supply, and expansion rates.
6. **Transfer Restrictions**: Optional restriction of transfers to existing token holders to maintain member-only circulation.
7. **Permanent Restriction Removal**: Owners can permanently disable transfer restrictions.

## Platform Features

### Frontend Pages

**Landing Page**
- Create new CAT tokens
- Access existing CAT contracts by address
- Quick navigation to CAT management interface

**CAT Page**
- View token contract parameters and variables
- Display current supply, maximum supply, threshold supply, and expansion rate
- Show transfer restriction status
- Owner-specific interface for minting and parameter modification

**Create CAT Page**
- Interactive form for constructor parameters
- Direct deployment through factory contract

**My CATs Page**
- Comprehensive list of all owned token contracts
- Wallet-connected user view

### Technical Stack

- **Frontend Framework**: Next.js
- **Styling**: TailwindCSS
- **UI Components**: ShadCN UI
- **Architecture**: Serverless (no backend required)
- **Storage**: On-chain storage via factory contract

## Local Development Setup

### Prerequisites

- Node.js and npm (or yarn)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/StabilityNexus/Clowder.git
cd Clowder
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure environment variables:

Create a `.env` file in the root directory:
```
NEXT_PUBLIC_PROJECT_ID=your-project-id
```

4. Obtain your Project ID:
   - Navigate to [https://cloud.reown.com/](https://cloud.reown.com/)
   - Create an account or sign in
   - Create a new project
   - Copy the Project ID from your project dashboard
   - Add it to your `.env` file

5. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
Clowder/
├── contracts/       # Smart contract source files
├── test/           # Contract test suites
├── web/            # Next.js frontend application
├── .github/        # GitHub Actions workflows
└── hardhat.config.js
```

## Smart Contract Development

The project uses Hardhat for smart contract development and testing. Key configuration files:

- `hardhat.config.js`: Hardhat configuration
- `contracts/`: Solidity smart contracts
- `test/`: Contract test files

## Contributing

Contributions are welcome. Please ensure all tests pass before submitting pull requests.

## License

Please refer to the repository for license information.

## Links

- [CAT Documentation](https://docs.stability.nexus/about-us/the-stable-order/cats)
- [Reown Cloud](https://cloud.reown.com/)

## Support

For issues and questions, please use the GitHub Issues section of this repository.