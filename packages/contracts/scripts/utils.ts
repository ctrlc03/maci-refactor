import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"
import { ethers } from "hardhat"

export const deployContract = async (
    contractName: string, 
    ...args: any
): Promise<string> => {
    const contractFactory = await ethers.getContractFactory(contractName)
    const contract = await contractFactory.deploy(...args)
    await contract.waitForDeployment()

    return await contract.getAddress()
}

export const deployPoseidonContracts = async () => {
	const PoseidonT3Contract = await deployContract('PoseidonT3')
	const PoseidonT4Contract = await deployContract('PoseidonT4')
	const PoseidonT5Contract = await deployContract('PoseidonT5')
	const PoseidonT6Contract = await deployContract('PoseidonT6')

	return {
		PoseidonT3Contract,
		PoseidonT4Contract,
		PoseidonT5Contract,
		PoseidonT6Contract,
	}
}

export const deployContractWithLinkedLibraries = async (
	contractName: string, 
	signer: HardhatEthersSigner,
	poseidonContracts: any,
	...args: any
): Promise<string> => {
	const contractFactory = await ethers.getContractFactory(contractName, {
		signer,
		libraries: {
			PoseidonT3: poseidonContracts.PoseidonT3Contract,
			PoseidonT4: poseidonContracts.PoseidonT4Contract,
			PoseidonT5: poseidonContracts.PoseidonT5Contract,
			PoseidonT6: poseidonContracts.PoseidonT6Contract,
		}
	})
	const contract = await contractFactory.deploy(...args)
	await contract.waitForDeployment()

	return await contract.getAddress()
}