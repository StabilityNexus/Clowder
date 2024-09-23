// SPDX-License-Identifier: AEL
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ContributionAccountingToken.sol"; // Make sure this import points to your CAT contract file

contract CATFactory is Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    // Mapping from owner address to token addresses
    mapping(address => address[]) private _administerableTokens;
    mapping(address => address[]) private _mintableTokens; // New mapping for minter roles

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
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        ContributionAccountingToken newCAT = new ContributionAccountingToken(
            msg.sender,
            maxSupply,
            thresholdSupply,
            maxExpansionRate,
            name,
            symbol
        );

        address catAddress = address(newCAT);
        _administerableTokens[msg.sender].push(catAddress);

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
        _mintableTokens[minter].push(catAddress); // Update mintable tokens mapping
    }

    /**
     * @dev Returns an array of CAT addresses owned by the given address.
     * @param owner The address to query the tokens of.
     * @return An array of CAT contract addresses.
     */
    function getOwnedCATs(address owner) public view returns (address[] memory) {
        uint256 totalTokens = _administerableTokens[owner].length + _mintableTokens[owner].length;
        address[] memory result = new address[](totalTokens);

        uint256 index = 0;
        for (uint256 i = 0; i < _administerableTokens[owner].length; i++) {
            result[index++] = _administerableTokens[owner][i];
        }
        for (uint256 j = 0; j < _mintableTokens[owner].length; j++) {
            result[index++] = _mintableTokens[owner][j];
        }

        return result;
    }

    /**
     * @dev Returns the total number of CATs created.
     * @return The total number of CATs.
     */
    function totalCATs() public view returns (uint256) {
        return _tokenIds.current();
    }
}