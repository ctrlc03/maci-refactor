import { ContractFactory, EventLog, ZeroAddress } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { 
    AccQueueFactory, 
    AccQueueBinary0, 
    AccQueueBinaryMaci, 
    AccQueueQuinary0, 
    AccQueueQuinaryMaci, 
    AccQueueQuinaryBlankSl 
} from "../typechain-types";
import { deployPoseidonContracts } from "../scripts";

describe("AccQueue/AccQueueFactory", () => {

    let owner: HardhatEthersSigner
    let ownerAddress: string 
    let user: HardhatEthersSigner
    let userAddress: string

    let accQueueFactoryFactory: ContractFactory 
    let accQueueFactory: AccQueueFactory

    let accQueueBinary0Factory: ContractFactory 
    let accQueueBinary0: AccQueueBinary0
    let accQueueBinary0Address: string 
    let accQueueBinaryMaciFactory: ContractFactory
    let accQueueBinaryMaci: AccQueueBinaryMaci
    let accQueueBinaryMaciAddress: string 
    let accQueueQuinary0Factory: ContractFactory
    let accQueueQuinary0: AccQueueQuinary0
    let accQueueQuinary0Address: string 
    let accQueueQuinaryMaciFactory: ContractFactory
    let accQueueQuinaryMaci: AccQueueQuinaryMaci
    let accQueueQuinaryMaciAddress: string 
    let accQueueQuinaryBlankSlFactory: ContractFactory
    let accQueueQuinaryBlankSl: AccQueueQuinaryBlankSl
    let accQueueQuinaryBlankSlAddress: string

    const SUB_DEPTH = 2

    before(async () => {
        [owner, user] = await ethers.getSigners()
        ownerAddress = await owner.getAddress()
        userAddress = await user.getAddress()

        // deploy the poseidon contracts
        const { PoseidonT3Contract, PoseidonT4Contract, PoseidonT5Contract, PoseidonT6Contract } = await deployPoseidonContracts()

        // deploy all other AccQueue contracts
        accQueueBinary0Factory = await ethers.getContractFactory("AccQueueBinary0", {
            signer: owner,
            libraries: {
                PoseidonT3: PoseidonT3Contract,
                PoseidonT4: PoseidonT4Contract,
                PoseidonT5: PoseidonT5Contract,
                PoseidonT6: PoseidonT6Contract
            }
        })
        accQueueBinary0 = (await accQueueBinary0Factory.deploy()) as AccQueueBinary0
        await accQueueBinary0.waitForDeployment()
        accQueueBinary0Address = await accQueueBinary0.getAddress()

        accQueueBinaryMaciFactory = await ethers.getContractFactory("AccQueueBinaryMaci", {
            signer: owner,
            libraries: {
                PoseidonT3: PoseidonT3Contract,
                PoseidonT4: PoseidonT4Contract,
                PoseidonT5: PoseidonT5Contract,
                PoseidonT6: PoseidonT6Contract
            }
        })
        accQueueBinaryMaci = (await accQueueBinaryMaciFactory.deploy()) as AccQueueBinaryMaci
        await accQueueBinaryMaci.waitForDeployment()
        accQueueBinaryMaciAddress = await accQueueBinaryMaci.getAddress()

        accQueueQuinary0Factory = await ethers.getContractFactory("AccQueueQuinary0", {
            signer: owner,
            libraries: {
                PoseidonT3: PoseidonT3Contract,
                PoseidonT4: PoseidonT4Contract,
                PoseidonT5: PoseidonT5Contract,
                PoseidonT6: PoseidonT6Contract
            }
        })
        accQueueQuinary0 = (await accQueueQuinary0Factory.deploy()) as AccQueueQuinary0
        await accQueueQuinary0.waitForDeployment()
        accQueueQuinary0Address = await accQueueQuinary0.getAddress()

        accQueueQuinaryMaciFactory = await ethers.getContractFactory("AccQueueQuinaryMaci", {
            signer: owner,
            libraries: {
                PoseidonT3: PoseidonT3Contract,
                PoseidonT4: PoseidonT4Contract,
                PoseidonT5: PoseidonT5Contract,
                PoseidonT6: PoseidonT6Contract
            }
        })
        accQueueQuinaryMaci = (await accQueueQuinaryMaciFactory.deploy()) as AccQueueQuinaryMaci
        await accQueueQuinaryMaci.waitForDeployment()
        accQueueQuinaryMaciAddress = await accQueueQuinaryMaci.getAddress()

        accQueueQuinaryBlankSlFactory = await ethers.getContractFactory("AccQueueQuinaryBlankSl", {
            signer: owner,
            libraries: {
                PoseidonT3: PoseidonT3Contract,
                PoseidonT4: PoseidonT4Contract,
                PoseidonT5: PoseidonT5Contract,
                PoseidonT6: PoseidonT6Contract
            }
        })
        accQueueQuinaryBlankSl = (await accQueueQuinaryBlankSlFactory.deploy()) as AccQueueQuinaryBlankSl
        await accQueueQuinaryBlankSl.waitForDeployment()
        accQueueQuinaryBlankSlAddress = await accQueueQuinaryBlankSl.getAddress()

        // deploy the factory contract for each 
        accQueueFactoryFactory = await ethers.getContractFactory("AccQueueFactory", owner)
        accQueueFactory = (await accQueueFactoryFactory.deploy(
            accQueueBinary0Address,
            accQueueBinaryMaciAddress,
            accQueueQuinary0Address,
            accQueueQuinaryMaciAddress,
            accQueueQuinaryBlankSlAddress
        )) as AccQueueFactory 
        await accQueueFactory.waitForDeployment()
    })

    it("should have set the correct template addresses", async () => {
        const binary0Template = await accQueueFactory.accQueueBinary0Template()
        expect(binary0Template).to.equal(accQueueBinary0Address)
        const binaryMaciTemplate = await accQueueFactory.accQueueBinaryMaciTemplate()
        expect(binaryMaciTemplate).to.equal(accQueueBinaryMaciAddress)
        const quinary0Template = await accQueueFactory.accQueueQuinary0Template()
        expect(quinary0Template).to.equal(accQueueQuinary0Address)
        const quinaryMaciTemplate = await accQueueFactory.accQueueQuinaryMaciTemplate()
        expect(quinaryMaciTemplate).to.equal(accQueueQuinaryMaciAddress)
        const quinaryBlankSlTemplate = await accQueueFactory.accQueueQuinaryBlankSlTemplate()
        expect(quinaryBlankSlTemplate).to.equal(accQueueQuinaryBlankSlAddress)
    })

    describe("AccQueueBinary0", () => {
        let contractAddress: string 
        let contract: AccQueueBinary0

        it("should allow to clone and initialize even after the original contract was set to initialized", async () => {
            const isInitializedBefore = await accQueueBinary0.isInitialized()
            expect(isInitializedBefore).to.be.false
            await expect(accQueueBinary0.initialize(SUB_DEPTH, 2, ownerAddress)).to.be.fulfilled
            const isInitialized = await accQueueBinary0.isInitialized()
            expect(isInitialized).to.be.true
        })

        it("should allow to deploy a new AccQueueBinary0 contract", async () => {
            const tx = await accQueueFactory.createNewInstanceBinary0(ownerAddress, SUB_DEPTH)
            const receipt = await tx.wait()
    
            const eventLogs = receipt?.logs as EventLog[] | undefined;
            const eventLog = eventLogs?.find(e => e.eventName === 'NewAccQueueBinary0Deployed')
            if (eventLog) {
                const data = eventLog.data as string;
                const address = accQueueFactory.interface.decodeEventLog('NewAccQueueBinary0Deployed', data)[0]
                expect(address).to.not.be.eq(ZeroAddress)
                contractAddress = address
                contract = accQueueBinary0Factory.attach(contractAddress) as AccQueueBinary0
            } else {
                expect(0).to.be.eq(1)
            }
        })

        it("should have been initialized", async () => {
            const isInitialized = await contract.isInitialized()
            expect(isInitialized).to.be.true
        })

        it("should not allow to init twice", async () => {
            await expect(contract.initialize(SUB_DEPTH, 2, ownerAddress))
            .to.be.revertedWithCustomError(contract, "AlreadyInitialized")
        })

        it("should have set the correct owner", async () => {
            const currentOwner = await contract.owner()
            expect(currentOwner).to.be.eq(ownerAddress)
        })

        it("should have set the correct parameters", async () => {

        })
    })

    describe("AccQueueBinaryMaci", () => {
        let contractAddress: string
        let contract: AccQueueBinaryMaci 

        it("should allow to deploy a new AccQueueBinaryMaci contract", async () => {
            const tx = await accQueueFactory.createNewInstanceBinaryMaci(ownerAddress, SUB_DEPTH)
            const receipt = await tx.wait()
    
            const eventLogs = receipt?.logs as EventLog[] | undefined;
            const eventLog = eventLogs?.find(e => e.eventName === 'NewAccQueueBinaryMaciDeployed')
            if (eventLog) {
                const data = eventLog.data as string;
                const address = accQueueFactory.interface.decodeEventLog('NewAccQueueBinaryMaciDeployed', data)[0]
                expect(address).to.not.be.eq(ZeroAddress)
                contractAddress = address 
                contract = accQueueBinaryMaciFactory.attach(contractAddress) as AccQueueBinaryMaci
            } else {
                expect(0).to.be.eq(1)
            }
        })

        it("should have been initialized", async () => {
            const isInitialized = await contract.isInitialized()
            expect(isInitialized).to.be.true
        })

        it("should not allow to init twice", async () => {
            await expect(contract.initialize(SUB_DEPTH, 2, ownerAddress))
            .to.be.revertedWithCustomError(contract, "AlreadyInitialized")
        })

        it("should have set the correct owner", async () => {
            const currentOwner = await contract.owner()
            expect(currentOwner).to.be.eq(ownerAddress)
        })

        it("should have set the correct parameters", async () => {

        })
    })

    describe("AccQueueQuinary0", () => {
        let contractAddress: string
        let contract: AccQueueQuinary0

        it("should allow to deploy a new AccQueueQuinary0 contract", async () => {
            const tx = await accQueueFactory.createNewInstanceQuinary0(ownerAddress, SUB_DEPTH)
            const receipt = await tx.wait()
    
            const eventLogs = receipt?.logs as EventLog[] | undefined;
            const eventLog = eventLogs?.find(e => e.eventName === 'NewAccQueueQuinary0Deployed')
            if (eventLog) {
                const data = eventLog.data as string;
                const address = accQueueFactory.interface.decodeEventLog('NewAccQueueQuinary0Deployed', data)[0]
                expect(address).to.not.be.eq(ZeroAddress)
                contractAddress = address
                contract = accQueueQuinary0Factory.attach(contractAddress) as AccQueueQuinary0
            } else {
                expect(0).to.be.eq(1)
            }
        })

        it("should have been initialized", async () => {
            const isInitialized = await contract.isInitialized()
            expect(isInitialized).to.be.true
        })

        it("should not allow to init twice", async () => {
            await expect(contract.initialize(SUB_DEPTH, 2, ownerAddress))
            .to.be.revertedWithCustomError(contract, "AlreadyInitialized")
        })

        it("should have set the correct owner", async () => {
            const currentOwner = await contract.owner()
            expect(currentOwner).to.be.eq(ownerAddress)
        })

        it("should have set the correct parameters", async () => {

        })
    })

    describe("AccQueueQuinaryMaci", () => {
        let contractAddress: string 
        let contract: AccQueueQuinaryMaci

        it("should allow to deploy a new AccQueueQuinaryMaci contract", async () => {
            const tx = await accQueueFactory.createNewInstanceQuinaryMaci(ownerAddress, SUB_DEPTH)
            const receipt = await tx.wait()
    
            const eventLogs = receipt?.logs as EventLog[] | undefined;
            const eventLog = eventLogs?.find(e => e.eventName === 'NewAccQueueQuinaryMaciDeployed')
            if (eventLog) {
                const data = eventLog.data as string;
                const address = accQueueFactory.interface.decodeEventLog('NewAccQueueQuinaryMaciDeployed', data)[0]
                expect(address).to.not.be.eq(ZeroAddress)
                contractAddress = address
                contract = accQueueQuinaryMaciFactory.attach(contractAddress) as AccQueueQuinaryMaci
            } else {
                expect(0).to.be.eq(1)
            }
        })
        
        it("should have been initialized", async () => {
            const isInitialized = await contract.isInitialized()
            expect(isInitialized).to.be.true
        })

        it("should not allow to init twice", async () => {
            await expect(contract.initialize(SUB_DEPTH, 2, ownerAddress))
            .to.be.revertedWithCustomError(contract, "AlreadyInitialized")
        })

        it("should have set the correct owner", async () => {
            const currentOwner = await contract.owner()
            expect(currentOwner).to.be.eq(ownerAddress)
        })

        it("should have set the correct parameters", async () => {

        })
    })
   
    describe("AccQueueQuinaryBlankSl", () => {
        let contractAddress: string 
        let contract: AccQueueQuinaryBlankSl

        it("should allow to deploy a new AccQueueQuinaryBlankSl contract", async () => {
            const tx = await accQueueFactory.createNewInstanceQuinaryBlankSl(ownerAddress, SUB_DEPTH)
            const receipt = await tx.wait()
    
            const eventLogs = receipt?.logs as EventLog[] | undefined;
            const eventLog = eventLogs?.find(e => e.eventName === 'NewAccQueueQuinaryBlankSlDeployed')
            if (eventLog) {
                const data = eventLog.data as string;
                const address = accQueueFactory.interface.decodeEventLog('NewAccQueueQuinaryBlankSlDeployed', data)[0]
                expect(address).to.not.be.eq(ZeroAddress)
                contractAddress = address
                contract = accQueueQuinaryBlankSlFactory.attach(contractAddress) as AccQueueQuinaryBlankSl
            } else {
                expect(0).to.be.eq(1)
            }
        })

        it("should have been initialized", async () => {
            const isInitialized = await contract.isInitialized()
            expect(isInitialized).to.be.true
        })

        it("should not allow to init twice", async () => {
            await expect(contract.initialize(SUB_DEPTH, 2, ownerAddress))
            .to.be.revertedWithCustomError(contract, "AlreadyInitialized")
        })

        it("should have set the correct owner", async () => {
            const currentOwner = await contract.owner()
            expect(currentOwner).to.be.eq(ownerAddress)
        })

        it("should have set the correct parameters", async () => {

        })
    })
})