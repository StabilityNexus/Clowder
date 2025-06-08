// SPDX-License-Identifier: AEL
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract ContributionAccountingToken is ERC20, ERC20Permit, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    
    uint256 public maxSupply;
    uint256 public thresholdSupply;
    uint256 public maxExpansionRate;
    bool public transferRestricted = true;
    uint256 public constant clowderFee = 500; // 0.5% fee
    address public immutable clowderTreasury = 0x355e559BCA86346B82D58be0460d661DB481E05e; // Address to receive minting fees
    
    uint256 public lastMintTimestamp;
    string public tokenName; // Token name
    string public tokenSymbol; // Token symbol

    // Constant denominator for fee calculations
    uint256 constant denominator = 100000;

    constructor(
        address defaultAdmin,
        uint256 _maxSupply,
        uint256 _thresholdSupply,
        uint256 _maxExpansionRate,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        
        maxSupply = _maxSupply;
        thresholdSupply = _thresholdSupply;
        maxExpansionRate = _maxExpansionRate;
        tokenName = _name;
        tokenSymbol = _symbol;
        lastMintTimestamp = block.timestamp;
    }

    function maxMintableAmount() public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        
        // If current supply is less than threshold, return remaining amount to threshold
        if (currentSupply < thresholdSupply) {
            return thresholdSupply - currentSupply;
        }
        
        // Calculate based on expansion rate
        uint256 elapsedTime = block.timestamp - lastMintTimestamp;
        uint256 maxMintableAmount = (currentSupply * maxExpansionRate * elapsedTime) / (365 days * 100);
        
        // Also check against remaining max supply
        uint256 remainingSupply = maxSupply - currentSupply;
        
        return maxMintableAmount < remainingSupply ? maxMintableAmount : remainingSupply;
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        
        // Minting fee calculation
        uint256 feeAmount = (amount * clowderFee) / denominator;
        
        // Check against max mintable amount
        require(amount + feeAmount <= maxMintableAmount(), "Exceeds maximum mintable amount");
        
        // Perform the actual minting
        _mint(to, amount);
        _mint(clowderTreasury, feeAmount);
        lastMintTimestamp = block.timestamp;
    }

    function reduceMaxSupply(uint256 newMaxSupply) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMaxSupply < maxSupply, "New max supply must be less than current max supply");
        maxSupply = newMaxSupply;
    }

    function reduceThresholdSupply(uint256 newThresholdSupply) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newThresholdSupply < thresholdSupply, "New threshold supply must be less than current threshold supply");
        thresholdSupply = newThresholdSupply;
    }

    function reduceMaxExpansionRate(uint256 newMaxExpansionRate) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMaxExpansionRate < maxExpansionRate, "New max expansion rate must be less than current max expansion rate");
        maxExpansionRate = newMaxExpansionRate;
    }

    function disableTransferRestriction() public onlyRole(DEFAULT_ADMIN_ROLE) {
        transferRestricted = false;
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (transferRestricted) {
            require(from == address(0) || to == address(0) || balanceOf(to) > 0, "Transfer restricted to existing token holders");
        }
        super._update(from, to, amount);
    }

    function grantMinterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
    }

    function revokeMinterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
    }
}
