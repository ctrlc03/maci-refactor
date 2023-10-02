import { ContractFactory, AbiCoder, ZeroAddress } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SignUpToken, SignUpTokenGatekeeper } from "../typechain-types";

describe("signUpTokenGatekeeper", () => {
    let owner: HardhatEthersSigner
    let ownerAddress: string 
    let user: HardhatEthersSigner
    let userAddress: string
    let mockMaciInstance: HardhatEthersSigner 
    let mockMaciInstanceAddress: string 

    let tokenFactory: ContractFactory
    let token: SignUpToken
    let tokenAddress: string 

    let signUpTokenGatekeeperFactory: ContractFactory
    let signUpTokenGatekeeper: SignUpTokenGatekeeper

    const tokenId: number = 0

    before(async () => {
        [owner, user, mockMaciInstance] = await ethers.getSigners()
        ownerAddress = await owner.getAddress()
        userAddress = await user.getAddress()
        mockMaciInstanceAddress = await mockMaciInstance.getAddress()
        tokenFactory = await ethers.getContractFactory("SignUpToken", owner)
        token = (await tokenFactory.deploy("Token", "TKN")) as SignUpToken
        tokenAddress = await token.getAddress()

        signUpTokenGatekeeperFactory = await ethers.getContractFactory("SignUpTokenGatekeeper", owner)
        signUpTokenGatekeeper = (await signUpTokenGatekeeperFactory.deploy(tokenAddress)) as SignUpTokenGatekeeper
        signUpTokenGatekeeper = await signUpTokenGatekeeper.waitForDeployment()

        await token.giveToken(userAddress)
        expect(await token.ownerOf(tokenId)).to.eq(userAddress)
    })

    it("should have the correct owner", async () => {
        const owner = await signUpTokenGatekeeper.owner()
        expect(owner).to.eq(ownerAddress)
    })

    it("should have the correct token address", async () => {
        expect(await signUpTokenGatekeeper.token()).to.eq(tokenAddress)
    })

    it("should have the maci instance address set as address zero", async () => {
        const maciAddress = await signUpTokenGatekeeper.maci()
        expect(maciAddress).to.be.eq(ZeroAddress)
    })

    it("should allow to set the MACI instance", async () => {
        await signUpTokenGatekeeper.connect(owner).setMaciInstance(mockMaciInstanceAddress)
        const address = await signUpTokenGatekeeper.maci()
        expect(address).to.eq(mockMaciInstanceAddress)
    })

    it("should prevent a non owner to set the maci contract address", async () => {
        await expect(signUpTokenGatekeeper.connect(user).setMaciInstance(mockMaciInstanceAddress)).to.be.revertedWith("UNAUTHORIZED")
    })

    it("should allow a user to sign up via maci (Mocked)", async () => {
        // ABI encode the tokenId from uint256 to bytes
        const encodedTokenId = AbiCoder.defaultAbiCoder().encode(["uint256"], [tokenId]);
        
        await signUpTokenGatekeeper.connect(mockMaciInstance).register(userAddress, encodedTokenId)
        expect(await signUpTokenGatekeeper.registeredTokenIds(tokenId)).to.be.true
    })

    it("should prevent a user to sign up twice", async () => {
        // ABI encode the tokenId from uint256 to bytes
        const encodedTokenId = AbiCoder.defaultAbiCoder().encode(["uint256"], [tokenId]);
    
        await expect(
            signUpTokenGatekeeper.connect(mockMaciInstance)
            .register(userAddress, encodedTokenId)
        ).to.be.revertedWithCustomError(signUpTokenGatekeeper, "AlreadySignedUp")
    })

    it("should revert when a user tries to sign up directly", async () => {
        // ABI encode the tokenId from uint256 to bytes
        const encodedTokenId = AbiCoder.defaultAbiCoder().encode(["uint256"], [tokenId]);
    
        await expect(signUpTokenGatekeeper.register(userAddress, encodedTokenId)).to.be.revertedWithCustomError(signUpTokenGatekeeper, "OnlyMaci")
    })

})