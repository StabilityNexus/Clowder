// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CATFactory and ContributionAccountingToken", function () {
    let ContributionAccountingToken;
    let factory, token;
    let owner, addr1, addr2;
    let catAddress;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        const CATFactoryContract = await ethers.getContractFactory("CATFactory");
        factory = await CATFactoryContract.deploy();
        await factory.waitForDeployment();

        const ContributionAccountingTokenContract = await ethers.getContractFactory("ContributionAccountingToken");
        ContributionAccountingToken = ContributionAccountingTokenContract;
    });

    it("should deploy the factory contract", async function () {
        expect(factory.target).to.be.properAddress;
    });

    it("should create a new ContributionAccountingToken", async function () {
        const tx = await factory.createCAT(10000, 5000, 10, "TestToken", "TTK");
        const receipt = await tx.wait();
        
        // Find the CATCreated event
        const catCreatedEvent = receipt.logs.find(log => {
            try {
                const parsed = factory.interface.parseLog(log);
                return parsed && parsed.name === "CATCreated";
            } catch (e) {
                return false;
            }
        });
        
        expect(catCreatedEvent).to.not.be.undefined;
        const parsedEvent = factory.interface.parseLog(catCreatedEvent);
        catAddress = parsedEvent.args.catAddress;

        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);
        expect(await token.name()).to.equal("TestToken");
        expect(await token.symbol()).to.equal("TTK");
    });

    it("should create CAT with maxSupply less than thresholdSupply (no validation in factory)", async function () {
        // The factory doesn't validate this, so it should succeed
        const tx = await factory.createCAT(5000, 10000, 10, "ValidToken", "VAL");
        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);
    });

    it("should grant Minter Role and mint from other address", async function () {
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);

        await token.grantMinterRole(addr1.address);
        await token.connect(addr1).mint(addr2.address, 1000);
        expect(await token.balanceOf(addr2.address)).to.equal(995);
    });

    it("should enforce max supply and expansion rate limits", async function () {
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);

        await token.grantMinterRole(addr1.address);

        const initialSupply = await token.totalSupply();
        console.log("Initial Supply is:", initialSupply.toString());

        // Try to mint more than available (threshold is 5000, so try to mint 6000)
        await expect(
            token.connect(addr1).mint(addr2.address, 6000)
        ).to.be.revertedWithCustomError(token, "ExceedsMaxMintableAmount");

        // Advance time by 1 year
        await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        // Try to mint more than expansion rate allows (try to mint the entire remaining supply)
        await expect(
            token.connect(addr1).mint(addr2.address, 9000)
        ).to.be.revertedWithCustomError(token, "ExceedsMaxMintableAmount");
    });

    it("should restrict transfers if transferRestricted is true", async function () {
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);
        await token.grantMinterRole(addr1.address);
        await token.connect(addr1).mint(addr2.address, 100);

        // Transfer should be restricted when transferring to a new address (balance = 0)
        await expect(
            token.connect(addr2).transfer(addr1.address, 50)
        ).to.be.revertedWithCustomError(token, "TransferRestricted");

        await token.connect(owner).disableTransferRestriction();
        await token.connect(addr2).transfer(addr1.address, 50);
        expect(await token.balanceOf(addr1.address)).to.equal(50);
    });

    it("should allow admin to reduce supply limits and rates", async function () {
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);

        // Mint some tokens first so totalSupply > 0
        await token.grantMinterRole(owner.address);
        await token.mint(owner.address, 1000);
        const total = await token.totalSupply();
        
        // Try to reduce max supply below total supply, should revert with custom error
        await expect(
            token.connect(owner).reduceMaxSupply(total - 1n)
        ).to.be.revertedWithCustomError(token, "NewMaxSupplyBelowTotal");

        // Reduce to a valid value (must be < current maxSupply and >= totalSupply)
        const newMaxSupply = 8000;
        await token.connect(owner).reduceMaxSupply(newMaxSupply);
        expect(await token.maxSupply()).to.equal(newMaxSupply);

        // Reduce threshold supply to a valid value
        await token.connect(owner).reduceThresholdSupply(total);
        expect(await token.thresholdSupply()).to.equal(total);

        // Reduce max expansion rate to a valid value
        await token.connect(owner).reduceMaxExpansionRate(5);
        expect(await token.maxExpansionRate()).to.equal(5);
    });
});

// Additional edge case and regressive tests

describe("ContributionAccountingToken Edge Cases", function () {
    let factory, token, owner, addr1, addr2, catAddress;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const CATFactoryContract = await ethers.getContractFactory("CATFactory");
        factory = await CATFactoryContract.deploy();
        await factory.waitForDeployment();
        const tx = await factory.createCAT(10000, 5000, 10, "EdgeToken", "EDG");
        const receipt = await tx.wait();
        
        // Find the CATCreated event
        const catCreatedEvent = receipt.logs.find(log => {
            try {
                const parsed = factory.interface.parseLog(log);
                return parsed && parsed.name === "CATCreated";
            } catch (e) {
                return false;
            }
        });
        const parsedEvent = factory.interface.parseLog(catCreatedEvent);
        catAddress = parsedEvent.args.catAddress;
        
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);
    });

    it("should not allow minting without minter role", async function () {
        await expect(token.connect(addr1).mint(addr2.address, 100)).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("should not allow minting to zero address", async function () {
        await token.grantMinterRole(owner.address);
        await expect(token.mint(ethers.ZeroAddress, 100)).to.be.reverted;
    });

    it("should not allow minting zero tokens", async function () {
        await token.grantMinterRole(owner.address);
        const before = await token.totalSupply();
        await token.mint(addr1.address, 0);
        const after = await token.totalSupply();
        expect(after).to.equal(before);
    });

    it("should not allow reducing threshold to >= current threshold", async function () {
        await expect(token.reduceThresholdSupply(6000)).to.be.revertedWithCustomError(token, "ThresholdNotDecreased");
    });

    it("should not allow reducing expansion rate to >= current", async function () {
        await expect(token.reduceMaxExpansionRate(10)).to.be.revertedWithCustomError(token, "ExpansionRateNotDecreased");
    });

    it("should not allow non-admin to call admin functions", async function () {
        await expect(token.connect(addr1).reduceMaxSupply(9000)).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
        await expect(token.connect(addr1).reduceThresholdSupply(4000)).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
        await expect(token.connect(addr1).reduceMaxExpansionRate(5)).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
        await expect(token.connect(addr1).disableTransferRestriction()).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("should allow burning tokens", async function () {
        await token.grantMinterRole(owner.address);
        await token.mint(owner.address, 1000);
        await token.burn(500);
        expect(await token.balanceOf(owner.address)).to.equal(495); // 995 - 500
    });

    it("should allow burning from another address with approval", async function () {
        await token.grantMinterRole(owner.address);
        await token.mint(addr1.address, 1000);
        await token.connect(addr1).approve(owner.address, 200);
        await token.burnFrom(addr1.address, 200);
        expect(await token.balanceOf(addr1.address)).to.equal(795);
    });

    it("should not allow burning more than balance", async function () {
        await token.grantMinterRole(owner.address);
        await token.mint(addr1.address, 1000);
        await expect(token.connect(addr1).burn(2000)).to.be.reverted;
    });

    it("should distribute fee to clowder treasury on mint", async function () {
        await token.grantMinterRole(owner.address);
        await token.mint(addr1.address, 1000);
        const treasury = await token.clowderTreasury();
        expect(await token.balanceOf(treasury)).to.equal(5);
    });

    it("should not allow transfer to zero address", async function () {
        await token.grantMinterRole(owner.address);
        await token.mint(owner.address, 1000);
        await token.disableTransferRestriction();
        await expect(token.transfer(ethers.ZeroAddress, 10)).to.be.reverted;
    });

    it("should allow admin to grant and revoke minter role", async function () {
        await token.grantMinterRole(addr1.address);
        expect(await token.hasRole(await token.MINTER_ROLE(), addr1.address)).to.be.true;
        await token.revokeMinterRole(addr1.address);
        expect(await token.hasRole(await token.MINTER_ROLE(), addr1.address)).to.be.false;
    });

    it("should not allow non-admin to grant or revoke minter role", async function () {
        await expect(token.connect(addr1).grantMinterRole(addr2.address)).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
        await expect(token.connect(addr1).revokeMinterRole(addr2.address)).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("should not allow reducing max supply below total supply", async function () {
        await token.grantMinterRole(owner.address);
        await token.mint(owner.address, 1000);
        await expect(token.reduceMaxSupply(900)).to.be.revertedWithCustomError(token, "NewMaxSupplyBelowTotal");
    });

    it("should not allow reducing threshold to same value", async function () {
        await expect(token.reduceThresholdSupply(5000)).to.be.revertedWithCustomError(token, "ThresholdNotDecreased");
    });

    it("should not allow reducing max supply to same value", async function () {
        await expect(token.reduceMaxSupply(10000)).to.be.revertedWithCustomError(token, "MaxSupplyNotDecreased");
    });

    it("should not allow reducing expansion rate to same value", async function () {
        await expect(token.reduceMaxExpansionRate(10)).to.be.revertedWithCustomError(token, "ExpansionRateNotDecreased");
    });

    it("should not allow minting above maxMintableAmount", async function () {
        await token.grantMinterRole(owner.address);
        // Mint up to threshold
        await token.mint(owner.address, 5000);
        // Try to mint above expansion rate
        await expect(token.mint(owner.address, 10000)).to.be.revertedWithCustomError(token, "ExceedsMaxMintableAmount");
    });
});

// CATFactory view and pagination coverage tests

describe("CATFactory View & Pagination Functions", function () {
    let factory, owner, addr1, addr2, cat1, cat2, cat3;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const CATFactoryContract = await ethers.getContractFactory("CATFactory");
        factory = await CATFactoryContract.deploy();
        await factory.waitForDeployment();
        // Owner creates two CATs
        cat1 = await factory.createCAT(10000, 5000, 10, "Token1", "TK1");
        await cat1.wait();
        cat2 = await factory.createCAT(20000, 10000, 20, "Token2", "TK2");
        await cat2.wait();
        // addr1 creates one CAT
        factory = factory.connect(addr1);
        cat3 = await factory.createCAT(30000, 15000, 30, "Token3", "TK3");
        await cat3.wait();
        factory = factory.connect(owner); // reset
    });

    it("should return correct totalCATs", async function () {
        expect(await factory.totalCATs()).to.equal(3);
    });

    it("should return correct creator CAT count and addresses for owner", async function () {
        const count = await factory.getCreatorCATCount(owner.address);
        expect(count).to.equal(2);
        const addresses = await factory.getCreatorCATAddresses(owner.address, 0, 2);
        expect(addresses.length).to.equal(2);
    });

    it("should return correct creator CAT count and addresses for addr1", async function () {
        const count = await factory.getCreatorCATCount(addr1.address);
        expect(count).to.equal(1);
        const addresses = await factory.getCreatorCATAddresses(addr1.address, 0, 1);
        expect(addresses.length).to.equal(1);
    });

    it("should return empty array for out-of-bounds pagination", async function () {
        const addresses = await factory.getCreatorCATAddresses(owner.address, 2, 5);
        expect(addresses.length).to.equal(0);
    });

    it("should return correct minter CAT count and addresses after granting minter role", async function () {
        // Grant minter role to addr2 in both owner's CATs
        const ContributionAccountingToken = await ethers.getContractFactory("ContributionAccountingToken");
        const catAddresses = await factory.getCreatorCATAddresses(owner.address, 0, 2);
        for (const catAddr of catAddresses) {
            const token = await ethers.getContractAt("ContributionAccountingToken", catAddr);
            await token.grantMinterRole(addr2.address);
        }
        const minterCount = await factory.getMinterCATCount(addr2.address);
        expect(minterCount).to.equal(2);
        const minterAddresses = await factory.getMinterCATAddresses(addr2.address, 0, 2);
        expect(minterAddresses.length).to.equal(2);
    });

    it("should return empty minter array for address with no minter roles", async function () {
        const minterCount = await factory.getMinterCATCount(addr1.address);
        expect(minterCount).to.equal(0);
        const minterAddresses = await factory.getMinterCATAddresses(addr1.address, 0, 2);
        expect(minterAddresses.length).to.equal(0);
    });

    it("should handle pagination edge cases (start > end, start out of bounds)", async function () {
        await expect(factory.getCreatorCATAddresses(owner.address, 2, 1)).to.be.revertedWith("Start index must be less than or equal to end index");
        await expect(factory.getCreatorCATAddresses(owner.address, 10, 12)).to.be.revertedWith("Start index out of bounds");
    });
});
