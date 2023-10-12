import { ethers } from "hardhat"
import { deployFactories } from "./deployFactories"
import { deployTemplates } from "./deployTemplates"
import { deployPoseidonContracts } from "./utils"

export const deploy = async () => {
    console.log("[i] Deploying contract templates and factories")
    const [signer] = await ethers.getSigners()
    const poseidonContracts = await deployPoseidonContracts()
    const factoriesArgs = await deployTemplates(signer, poseidonContracts)
    const factories = await deployFactories(factoriesArgs, signer)
}

deploy()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })