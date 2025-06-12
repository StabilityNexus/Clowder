// SPDX-License-Identifier: AEL
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface ICATFactory {
    function onMinterRoleGranted(address minter) external;
}

contract ContributionAccountingToken is ERC20Burnable, ERC20Permit, AccessControl {
    // Custom errors
    error ExceedsMaxMintableAmount(uint256 requested, uint256 available);
    error NewMaxSupplyNotLess(uint256 newMax, uint256 currentMax);
    error NewMaxSupplyBelowTotal(uint256 newMax, uint256 total);
    error NewThresholdNotLess(uint256 newThreshold, uint256 currentThreshold);
    error NewThresholdBelowTotal(uint256 newThreshold, uint256 total);
    error NewMaxExpansionNotLess(uint256 newExp, uint256 currentExp);
    error TransferRestrictedError();

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

    uint256 constant denominator = 100000;  // Constant denominator for fee calculations

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
        lastMintTimestamp = block.timestamp;
    }

    function maxMintableAmount() public view returns (uint256) {
        uint256 currentSupply = totalSupply();
        if (currentSupply < thresholdSupply) {
            return thresholdSupply - currentSupply;
        }
        uint256 elapsedTime = block.timestamp - lastMintTimestamp;
        uint256 maxMint = (currentSupply * maxExpansionRate * elapsedTime) / (365 days * 100);
        uint256 remaining = maxSupply - currentSupply;
        return maxMint < remaining ? maxMint : remaining;
    }

    function userAmountAfterFees(uint256 amount) public pure returns (uint256 userAmount, uint256 feeAmount) {
        feeAmount = (amount * clowderFee) / denominator;
        userAmount = amount - feeAmount;
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        uint256 available = maxMintableAmount();
        if (amount > available) {
            revert ExceedsMaxMintableAmount(amount, available);
        }
        (uint256 userAmount, uint256 feeAmount) = userAmountAfterFees(amount);
        _mint(to, userAmount);
        _mint(clowderTreasury, feeAmount);
        lastMintTimestamp = block.timestamp;
    }

    function reduceMaxSupply(uint256 newMaxSupply) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMaxSupply >= maxSupply) {
            revert NewMaxSupplyNotLess(newMaxSupply, maxSupply);
        }
        if (newMaxSupply < totalSupply()) {
            revert NewMaxSupplyBelowTotal(newMaxSupply, totalSupply());
        }
        maxSupply = newMaxSupply;
    }

    function reduceThresholdSupply(uint256 newThresholdSupply) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newThresholdSupply >= thresholdSupply) {
            revert NewThresholdNotLess(newThresholdSupply, thresholdSupply);
        }
        if (newThresholdSupply < totalSupply()) {
            revert NewThresholdBelowTotal(newThresholdSupply, totalSupply());
        }
        thresholdSupply = newThresholdSupply;
    }

    function reduceMaxExpansionRate(uint256 newMaxExpansionRate) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMaxExpansionRate >= maxExpansionRate) {
            revert NewMaxExpansionNotLess(newMaxExpansionRate, maxExpansionRate);
        }
        maxExpansionRate = newMaxExpansionRate;
    }

    function disableTransferRestriction() public onlyRole(DEFAULT_ADMIN_ROLE) {
        transferRestricted = false;
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (transferRestricted && from != address(0) && to != address(0) && balanceOf(to) == 0) {
            revert TransferRestrictedError();
        }
        super._update(from, to, amount);
    }

    function grantMinterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
        ICATFactory(factory).onMinterRoleGranted(account);
    }
    function revokeMinterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
    }
}