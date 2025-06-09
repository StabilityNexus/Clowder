// SPDX-License-Identifier: AEL
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ContributionAccountingToken.sol"; 

contract CATFactory is Ownable {
    uint256 private _nextTokenId;

    // Mapping from owner address to token addresses
    mapping(address => address[]) public administerableTokens; 
    mapping(address => address[]) public mintableTokens; 

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
        emit CATCreated(msg.sender, catAddress, _nextTokenId);
        _nextTokenId++; // Increment tokenId for the next contract

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
        return _nextTokenId;
    }

    function getCATAddresses(address _creator, uint256 start, uint256 end) external view returns (address[] memory) {
        address[] memory creatorTokens = administerableTokens[_creator];
        
        require(start <= end, "Start index must be less than or equal to end index");
        require(start < creatorTokens.length, "Start index out of bounds");
        
        if (end >= creatorTokens.length) {
            end = creatorTokens.length - 1;
        }
        
        uint256 resultLength = end - start + 1;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = creatorTokens[start + i];
        }
        
        return result;
    }
}
