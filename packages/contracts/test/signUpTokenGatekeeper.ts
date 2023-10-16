import { ContractFactory, AbiCoder, ZeroAddress, EventLog } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SignUpGatekeeperFactory, SignUpToken, SignUpTokenGatekeeper, SignUpTokenGatekeeper__factory } from "../typechain-types";

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

    let signUpTokenGatekeeperFactoryFactory: ContractFactory
    let signUpTokenGatekeeperFactory: SignUpGatekeeperFactory

    let signUpTokenGatekeeperF: ContractFactory
    let signUpTokenGatekeeper: SignUpTokenGatekeeper

    let signUpTokenGatekeeperClone: SignUpTokenGatekeeper
    let signUpTokenGatekeeperCloneAddress: string 

    const tokenId: number = 0

    before(async () => {
        [owner, user, mockMaciInstance] = await ethers.getSigners()
        ownerAddress = await owner.getAddress()
        userAddress = await user.getAddress()
        mockMaciInstanceAddress = await mockMaciInstance.getAddress()
        tokenFactory = await ethers.getContractFactory("SignUpToken", owner)
        token = (await tokenFactory.deploy()) as SignUpToken
        token = await token.waitForDeployment()
        tokenAddress = await token.getAddress()

        signUpTokenGatekeeperF = await ethers.getContractFactory("SignUpTokenGatekeeper", owner)
        signUpTokenGatekeeper = (await signUpTokenGatekeeperF.deploy()) as SignUpTokenGatekeeper
        signUpTokenGatekeeper = await signUpTokenGatekeeper.waitForDeployment()

        signUpTokenGatekeeperFactoryFactory = await ethers.getContractFactory("SignUpGatekeeperFactory", owner)
        signUpTokenGatekeeperFactory = (await signUpTokenGatekeeperFactoryFactory.deploy(await signUpTokenGatekeeper.getAddress())) as SignUpGatekeeperFactory
        signUpTokenGatekeeperFactory = await signUpTokenGatekeeperFactory.waitForDeployment()

        await token.giveToken(userAddress)
        expect(await token.ownerOf(tokenId)).to.eq(userAddress)

    })

    it("should deploy a clone", async () => {
        const tx = await signUpTokenGatekeeperFactory.createNewInstance(ownerAddress, tokenAddress, mockMaciInstanceAddress)
        const receipt = await tx.wait()

        const eventLogs = receipt?.logs as EventLog[] | undefined;
        const eventLog = eventLogs?.find(e => e.eventName === 'NewSignUpTokenDeployed')
        if (eventLog) {
            const data = eventLog.data as string;
            const address = signUpTokenGatekeeperFactory.interface.decodeEventLog('NewSignUpTokenDeployed', data)[0]
            expect(address).to.not.be.eq(ZeroAddress)
            signUpTokenGatekeeperCloneAddress = address
            signUpTokenGatekeeperClone = signUpTokenGatekeeperF.attach(signUpTokenGatekeeperCloneAddress) as SignUpTokenGatekeeper
        } else {
            expect(0).to.be.eq(1)
        }
    })

    it("should have the correct owner", async () => {
        const owner = await signUpTokenGatekeeperClone.owner()
        expect(owner).to.eq(ownerAddress)
    })

    it("should have the correct token address", async () => {
        expect(await signUpTokenGatekeeperClone.token()).to.eq(tokenAddress)
    })

    it("should allow to set the MACI instance", async () => {
        await signUpTokenGatekeeperClone.connect(owner).setMaciInstance(mockMaciInstanceAddress)
        const address = await signUpTokenGatekeeperClone.maci()
        expect(address).to.eq(mockMaciInstanceAddress)
    })

    it("should prevent a non owner to set the maci contract address", async () => {
        await expect(signUpTokenGatekeeperClone.connect(user).setMaciInstance(mockMaciInstanceAddress)).to.be.revertedWith("UNAUTHORIZED")
    })

    it("should allow a user to sign up via maci (Mocked)", async () => {
        // ABI encode the tokenId from uint256 to bytes
        const encodedTokenId = AbiCoder.defaultAbiCoder().encode(["uint256"], [tokenId]);
        
        await signUpTokenGatekeeperClone.connect(mockMaciInstance).register(userAddress, encodedTokenId)
        expect(await signUpTokenGatekeeperClone.registeredTokenIds(tokenId)).to.be.true
    })

    it("should prevent a user to sign up twice", async () => {
        // ABI encode the tokenId from uint256 to bytes
        const encodedTokenId = AbiCoder.defaultAbiCoder().encode(["uint256"], [tokenId]);
    
        await expect(
            signUpTokenGatekeeperClone.connect(mockMaciInstance)
            .register(userAddress, encodedTokenId)
        ).to.be.revertedWithCustomError(signUpTokenGatekeeperClone, "AlreadySignedUp")
    })

    it("should revert when a user tries to sign up directly", async () => {
        // ABI encode the tokenId from uint256 to bytes
        const encodedTokenId = AbiCoder.defaultAbiCoder().encode(["uint256"], [tokenId]);
    
        await expect(signUpTokenGatekeeperClone.register(userAddress, encodedTokenId)).to.be.revertedWithCustomError(signUpTokenGatekeeperClone, "OnlyMaci")
    })

})