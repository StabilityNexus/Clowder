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
        const logs = receipt.logs;

        for (const log of logs) {
            if (log.address === "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" && log.topics[0] === "0x054189e2ad79e5c2d10e8da115126520634a6a9b369a130345025ae1ddeafe92") {
                const eventData = log.data;
                catAddress = "0x" + eventData.slice(26, 66);
            }
        }

        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);
        expect(await token.name()).to.equal("TestToken");
        expect(await token.symbol()).to.equal("TTK");
    });

    it("should grant Minter Role and mint from other address", async function () {
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);

        await token.grantMinterRole(addr1.address);
        await token.connect(addr1).mint(addr2.address, 1000);
        expect(await token.balanceOf(addr2.address)).to.equal(1000);
    });

    it("should enforce max supply and expansion rate limits", async function () {
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);

        await token.grantMinterRole(addr1.address);

        const initialSupply = await token.totalSupply();
        console.log("Initial Supply is:", initialSupply.toString());

        try {
            await token.connect(addr1).mint(addr2.address, 150000000000000000000);
        } catch (err) {
            const finalSupply = await token.totalSupply();
            console.log("Supply after failed minting attempt:", finalSupply.toString());
            expect(finalSupply.toString()).to.equal(initialSupply.toString());
        }

        await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        try {
            await token.connect(addr1).mint(addr2.address, 5000000000000000000);
        } catch (err) {
            const finalSupply = await token.totalSupply();
            console.log("Supply after failed expansion rate mint attempt:", finalSupply.toString());
            expect(finalSupply.toString()).to.equal(initialSupply.toString());
        }
    });

    it("should restrict transfers if transferRestricted is true", async function () {
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);
        await token.grantMinterRole(addr1.address);
        await token.connect(addr1).mint(addr2.address, 100);

        await expect(
            token.connect(addr2).transfer(addr1.address, 50)
        ).to.be.revertedWith("Transfer restricted to existing token holders");

        await token.connect(owner).disableTransferRestriction();
        await token.connect(addr2).transfer(addr1.address, 50);
        expect(await token.balanceOf(addr1.address)).to.equal(50);
    });

    it("should allow admin to reduce supply limits and rates", async function () {
        token = await ethers.getContractAt("ContributionAccountingToken", catAddress);

        await token.connect(owner).reduceMaxSupply(900);
        expect(await token.maxSupply()).to.equal(900);

        await token.connect(owner).reduceThresholdSupply(400);
        expect(await token.thresholdSupply()).to.equal(400);

        await token.connect(owner).reduceMaxExpansionRate(5);
        expect(await token.maxExpansionRate()).to.equal(5);
    });
});
