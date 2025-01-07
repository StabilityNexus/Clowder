// SPDX-License-Identifier: AEL
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ContributionAccountingToken.sol"; // Ensure this import points to your CAT contract file

contract CATFactory is Ownable {
    // Tracking the next tokenId (no Counters library, just a simple uint)
    uint256 private _nextTokenId;

    // Mapping from owner address to token addresses
    mapping(address => address[]) public administerableTokens; // Now public
    mapping(address => address[]) public mintableTokens; // Now public

    // Event emitted when a new CAT is created
    event CATCreated(address indexed owner, address catAddress, uint256 tokenId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new CAT contract and assigns it to the caller.
     * @param maxSupply The maximum supply for the new CAT.
     * @param thresholdSupply The threshold supply for the new CAT.
     * @param maxExpansionRate The maximum expansion rate for the new CAT.
     * @param name The name of the CAT token.
     * @param symbol The symbol of the CAT token.
     * @return The address of the newly created CAT contract.
     */
    function createCAT(
        uint256 maxSupply,
        uint256 thresholdSupply,
        uint256 maxExpansionRate,
        string memory name,
        string memory symbol
    ) public returns (address) {
        uint256 newTokenId = _nextTokenId;
        _nextTokenId++; // Increment tokenId for the next contract

        ContributionAccountingToken newCAT = new ContributionAccountingToken(
            msg.sender,
            maxSupply,
            thresholdSupply,
            maxExpansionRate,
            name,
            symbol
        );

        address catAddress = address(newCAT);
        administerableTokens[msg.sender].push(catAddress);

        emit CATCreated(msg.sender, catAddress, newTokenId);

        return catAddress;
    }

    /**
     * @dev Grants minter role to an address in the CAT contract.
     * @param catAddress The address of the CAT contract.
     * @param minter The address to grant the minter role.
     */
    function grantMinterRole(address catAddress, address minter) public onlyOwner {
        ContributionAccountingToken(catAddress).grantMinterRole(minter);
        mintableTokens[minter].push(catAddress); // Update mintable tokens mapping
    }

    /**
     * @dev Returns the total number of CATs created.
     * @return The total number of CATs.
     */
    function totalCATs() public view returns (uint256) {
        return _nextTokenId - 1; // Subtract 1 because the counter starts from 1
    }
}
