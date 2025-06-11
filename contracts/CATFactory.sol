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
     * @dev Notifies the factory that a minter role has been granted in a CAT contract.
     * This function is called by CAT contracts when their admins grant minter roles.
     * @param catAddress The address of the CAT contract calling this function.
     * @param minter The address that was granted the minter role.
     */
    function onMinterRoleGranted(address catAddress, address minter) external {
        // Verify that the caller is the CAT contract
        require(msg.sender == catAddress, "Only CAT contract can call this function");
        mintableTokens[minter].push(catAddress);
    }

    /**
     * @dev Returns the total number of CATs created.
     * @return The total number of CATs.
     */
    function totalCATs() public view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Returns a paginated list of CAT addresses that the given address can administer.
     * @param _creator The address of the creator/administrator.
     * @param start The starting index for pagination.
     * @param end The ending index for pagination.
     * @return An array of CAT addresses that the creator can administer.
     */
    function getCreatorCATAddresses(address _creator, uint256 start, uint256 end) external view returns (address[] memory) {
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

    function getMinterCATAddresses(address _minter, uint256 start, uint256 end) external view returns (address[] memory) {
        address[] memory minterTokens = mintableTokens[_minter];
        
        require(start <= end, "Start index must be less than or equal to end index");
        require(start <= minterTokens.length, "Start index out of bounds");
        
        if (end >= minterTokens.length) {
            end = minterTokens.length;
        }
        
        uint256 resultLength = end - start;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = minterTokens[start + i];
        }
        
        return result;
    }

    function getCreatorCATCount(address _creator) external view returns (uint256) {
        return administerableTokens[_creator].length;
    }
    function getMinterCATCount(address _minter) external view returns (uint256) {
        return mintableTokens[_minter].length;
    }

}
