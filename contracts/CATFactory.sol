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
            address(this),
            maxSupply,
            thresholdSupply,
            maxExpansionRate,
            name,
            symbol
        );

        address catAddress = address(newCAT);
        administerableTokens[msg.sender].push(catAddress);
        emit CATCreated(msg.sender, catAddress, _nextTokenId);
        _nextTokenId++;

        return catAddress;
    }

    /**
     * @dev Grants minter role to an address in the CAT contract.
     * This function is called by CAT contracts when their admins want to grant minter roles.
     * @param catAddress The address of the CAT contract calling this function.
     * @param minter The address to grant the minter role.
     */
    function grantMinterRole(address catAddress, address minter) external {
        // Verify that the caller is the admin of the CAT contract
        require(ContributionAccountingToken(catAddress).hasRole(ContributionAccountingToken(catAddress).DEFAULT_ADMIN_ROLE(), msg.sender), 
                "Only CAT admin can grant minter role");
        
        mintableTokens[minter].push(catAddress);        
        ContributionAccountingToken(catAddress)._grantMinterRoleFromFactory(minter);          // Call back to the CAT contract to actually grant the role
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
        require(start <= creatorTokens.length, "Start index out of bounds");
        
        if (end >= creatorTokens.length) {
            end = creatorTokens.length;
        }
        
        uint256 resultLength = end - start;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = creatorTokens[start + i];
        }
        
        return result;
    }
}
