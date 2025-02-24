# Clowder

> Fun fact: "Clowder" is the collective noun for cats.

Clowder is a minimalistic platform allowing anyone to create [CATs (Contribution Accounting Tokens)](https://docs.stability.nexus/about-us/the-stable-order/cats).

CATs are fungible tokens (e.g. ERC20 tokens) that are used to track the value of contributions to a project by members of a decentralized organization. CATs have the following characteristics:

1. The initial supply of tokens is zero.
2. The user who deploys the token contract is its initial owner.
3. The contract may have multiple owners and owners may grant ownership to others.
4. All owners have permission to mint tokens.
5. There is an optional maximum supply of tokens, above which minting is forbidden.
6. There is a threshold supply of tokens, below which minting is unrestricted.
7. There is a maximum supply expansion rate that is enforced when the supply exceeds the threshold.
8. Owners have permission to permanently reduce the maximum supply of tokens and the threshold supply of tokens.
9. Owners have permission to permanently reduce the maximum supply expansion rate.
10. Transfers of tokens may be restricted to accounts that already have tokens, in order to keep the tokens circulating only among members of a project.
11. Owners may permanently disable the transfer restriction.

The platform's frontend has the following pages:

- **Landing Page**: This page has a "Create CAT" button (which redirects to the *CAT Creation Page*), a text field for the user to input a CAT contract address, and a "Use CAT" button (which redirects to the *CAT Page* for the CAT contract input in the text field).
- **CAT Page**: This page reads from the URL the address of the token contract and allows users to interact with the respective token contract. It shows parameters and variables of the token contract such as current supply, maximum supply, threshold supply, maximum expansion rate, and transfer restriction. For owners who have connected their wallets, it also shows fields and buttons to mint tokens and to modify the parameters of the token contract.
- **Create CAT Page**: This page shows a form where the user can input the constructor parameters for the desired CAT and a "Deploy CAT" button that calls the factory contract to deploy the CAT with the desired parameters.
- **My CATs Page**: This page lists all token contracts owned by the user who connected their wallet.

The platform's frontend is built with Next.js, TailwindCSS, and ShadCN UI.

The platform has no backend. The list of token contracts owned by each address is stored in the factory contract.

---

## Local Setup Instructions

To set up Clowder locally, follow these steps:

1. **Clone the Repository**  
   Clone this repository to your local machine:
   ```bash
   git clone https://github.com/your-username/clowder.git
   cd clowder
2. Install Dependencies
    Install the required packages using your preferred package manager:

    bash
    Copy
    npm install
    # or
    yarn install

3. Set Up Environment Variables
    Create a .env file in the root directory of the project and add the following environment variable:
    NEXT_PUBLIC_PROJECT_ID=your-project-id

4. Obtain Your Project ID
    To get the your-project-id value for NEXT_PUBLIC_PROJECT_ID, follow these steps:
    Go to https://cloud.reown.com/.
    Create an account or log in if you already have one.
    Create a new project within the dashboard.
    Once the project is created, locate your project key (this might be labeled as "Project ID" or "API Key").
    Copy this key and paste it into your .env file as the value for NEXT_PUBLIC_PROJECT_ID.

5. Run the Development Server
    Start the local development server:

    npm run dev
    # or
    yarn dev


Your application should now be running on http://localhost:3000.