// SPDX-License-Identifier: AEL
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface ICATFactory {
    function grantMinterRole(address catAddress, address minter) external;
}

contract ContributionAccountingToken is ERC20Burnable, ERC20Permit, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    
    uint256 public maxSupply;
    uint256 public thresholdSupply;
    uint256 public maxExpansionRate;
    bool public transferRestricted = true;
    uint256 public constant clowderFee = 500; // 0.5% fee
    address public immutable clowderTreasury = 0x355e559BCA86346B82D58be0460d661DB481E05e; // Address to receive minting fees
    address public immutable factory; // Reference to the factory contract that created this CAT
    
    uint256 public lastMintTimestamp;
    string public tokenName; // Token name
    string public tokenSymbol; // Token symbol

    // Constant denominator for fee calculations
    uint256 constant denominator = 100000;

    constructor(
        address defaultAdmin,
        address _factory,
        uint256 _maxSupply,
        uint256 _thresholdSupply,
        uint256 _maxExpansionRate,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        
        factory = _factory;
        maxSupply = _maxSupply;
        thresholdSupply = _thresholdSupply;
        maxExpansionRate = _maxExpansionRate;
        tokenName = _name;
        tokenSymbol = _symbol;
        lastMintTimestamp = block.timestamp;
    }

    function maxMintableAmount() public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        
        if (currentSupply < thresholdSupply) {
            return thresholdSupply - currentSupply;
        }
        uint256 elapsedTime = block.timestamp - lastMintTimestamp;
        uint256 maxMintableAmount = (currentSupply * maxExpansionRate * elapsedTime) / (365 days * 100);
        uint256 remainingSupply = maxSupply - currentSupply;
        
        return maxMintableAmount < remainingSupply ? maxMintableAmount : remainingSupply;
    }

    function userAmountAfterFees(uint256 amount) public pure returns (uint256) {
        uint256 feeAmount = (amount * clowderFee) / denominator;
        return amount - feeAmount;
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(amount <= maxMintableAmount(), "Exceeds maximum mintable amount");
        
        uint256 userAmount = userAmountAfterFees(amount);
        uint256 feeAmount = amount - userAmount;
        
        // Perform the actual minting: fees are deducted from the amount
        _mint(to, userAmount);
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
        ICATFactory(factory).grantMinterRole(address(this), account);
    }

    function grantMinterRoleFromFactory(address account) external {
        require(msg.sender == factory, "Only factory can call this function");
        grantRole(MINTER_ROLE, account);
    }

    function revokeMinterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
    }
}
