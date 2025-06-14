// SPDX-License-Identifier: AEL
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ContributionAccountingToken.sol"; 

contract CATFactory is Ownable {
    uint256 private _nextTokenId;

    mapping(address => address[]) public creatorTokens;  // Mapping from owner address to token addresses
    mapping(address => address[]) public minterTokens;
    
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
        creatorTokens[msg.sender].push(catAddress);
        emit CATCreated(msg.sender, catAddress, _nextTokenId);
        _nextTokenId++;

        return catAddress;
    }

    /**
     * @dev Notifies the factory that a minter role has been granted in a CAT contract.
     * This function is called by CAT contracts when their admins grant minter roles.
     */
    function onMinterRoleGranted(address minter) external {    
        if (!isMinterForCAT[minter][msg.sender]) {
            isMinterForCAT[minter][msg.sender] = true;
            minterTokens[minter].push(msg.sender); 
        }
    }

    /**
     * @dev Internal function to get a subarray from any address array with pagination.
     * @param tokens The storage reference to the array of token addresses. start and end are the indexes of the subarray.
     * @return An array of addresses for the specified range.
     */
    function _getSubArray(address[] storage tokens, uint256 start, uint256 end) internal view returns (address[] memory) {
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
        return _getSubArray(creatorTokens[_creator], start, end);
    }
    function getMinterCATAddresses(address _minter, uint256 start, uint256 end) external view returns (address[] memory) {
        return _getSubArray(minterTokens[_minter], start, end);
    }

    function totalCATs() public view returns (uint256) { return _nextTokenId; }
    function getCreatorCATCount(address _creator) external view returns (uint256) { return creatorTokens[_creator].length; }
    function getMinterCATCount(address _minter) external view returns (uint256) { return minterTokens[_minter].length; }
}