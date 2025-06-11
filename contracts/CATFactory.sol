// SPDX-License-Identifier: AEL
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ContributionAccountingToken.sol"; 

contract CATFactory is Ownable {
    uint256 private _nextTokenId;

    // Mapping from owner address to token addresses
    mapping(address => address[]) public administerableTokens;  
    mapping(address => address[]) public mintableTokens;
    
    mapping(address => mapping(address => bool)) public isMinterForCAT; 

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
     * @param minter The address that was granted the minter role.
     */
    function onMinterRoleGranted(address minter) external {    
        if (isMinterForCAT[minter][msg.sender]) {
            return; 
        }
        isMinterForCAT[minter][msg.sender] = true;
        mintableTokens[minter].push(msg.sender);
    }

    function totalCATs() public view returns (uint256) {
        return _nextTokenId;
    }

    /**
     * @dev Internal function to get a subarray from any address array with pagination.
     * @param tokens The array of token addresses to paginate.
     * @param start The starting index for pagination.
     * @param end The ending index for pagination.
     * @return An array of addresses for the specified range.
     */
    function _getSubArray(address[] memory tokens, uint256 start, uint256 end) internal pure returns (address[] memory) {
        require(start <= end, "Start index must be less than or equal to end index");
        require(start <= tokens.length, "Start index out of bounds");
        
        if (end >= tokens.length) {
            end = tokens.length;
        }
        
        uint256 resultLength = end - start;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = tokens[start + i];
        }
        
        return result;
    }

    function getCreatorCATAddresses(address _creator, uint256 start, uint256 end) external view returns (address[] memory) {
        return _getSubArray(administerableTokens[_creator], start, end);
    }

    function getMinterCATAddresses(address _minter, uint256 start, uint256 end) external view returns (address[] memory) {
        return _getSubArray(mintableTokens[_minter], start, end);
    }

    function getCreatorCATCount(address _creator) external view returns (uint256) {
        return administerableTokens[_creator].length;
    }
    function getMinterCATCount(address _minter) external view returns (uint256) {
        return mintableTokens[_minter].length;
    }

}
