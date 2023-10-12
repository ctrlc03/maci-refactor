import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DeployFactoriesArgs } from "./interfaces";
import { deployContract, deployContractWithLinkedLibraries } from "./utils";

export const deployTemplates = async (signer: HardhatEthersSigner, poseidonContracts: any): Promise<DeployFactoriesArgs> => {
    const maciTemplate = await deployContractWithLinkedLibraries('MACI', signer, poseidonContracts)
    const pollTemplate = await deployContract('Poll')
    const signupGatekeeperTemplate = await deployContract('SignUpTokenGatekeeper')
    const signUpTokenTemplate = await deployContract('SignUpToken')
    const vkRegistryTemplate = await deployContract('VkRegistry')
    const accQueueBinary0Template = await deployContractWithLinkedLibraries('AccQueueBinary0', signer, poseidonContracts)
    const accQueueBinaryMaciTemplate = await deployContractWithLinkedLibraries('AccQueueBinaryMaci', signer, poseidonContracts)
    const accQueueQuinary0Template = await deployContractWithLinkedLibraries('AccQueueQuinary0', signer, poseidonContracts)
    const accQueueQuinaryMaciTemplate = await deployContractWithLinkedLibraries('AccQueueQuinaryMaci', signer, poseidonContracts)
    const accQueueQuinaryBlankSlTemplate = await deployContractWithLinkedLibraries('AccQueueQuinaryBlankSl', signer, poseidonContracts)

    console.log('[+] MACI:', maciTemplate)
    console.log('[+] Poll:', pollTemplate)
    console.log('[+] SignUpTokenGatekeeper:', signupGatekeeperTemplate)
    console.log('[+] SignupToken:', signUpTokenTemplate)
    console.log('[+] VkRegistry:', vkRegistryTemplate)
    console.log('[+] AccQueueBinary0:', accQueueBinary0Template)
    console.log('[+] AccQueueBinaryMaci:', accQueueBinaryMaciTemplate)
    console.log('[+] AccQueueQuinary0:', accQueueQuinary0Template)
    console.log('[+] AccQueueQuinaryMaci:', accQueueQuinaryMaciTemplate)
    console.log('[+] AccQueueQuinaryBlankSl:', accQueueQuinaryBlankSlTemplate)

    return {
        maciTemplate,
        pollTemplate,
        signupGatekeeperTemplate,
        signUpTokenTemplate,
        vkRegistryTemplate,
        accQueueBinary0Template,
        accQueueBinaryMaciTemplate,
        accQueueQuinary0Template,
        accQueueQuinaryMaciTemplate,
        accQueueQuinaryBlankSlTemplate
    }
}