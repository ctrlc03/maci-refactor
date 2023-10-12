import { ContractFactories, DeployFactoriesArgs } from './interfaces'
import { deployContract } from './utils'

export const deployFactories = async (args: DeployFactoriesArgs, poseidonContracts: any): Promise<ContractFactories> => {
    const maciFactory = await deployContract('MaciFactory', args.maciTemplate)
    const pollFactory = ""
    // const pollFactory = await deployContract('PollFactory', args.pollTemplate)
    const vkRegistryFactory = await deployContract('VkRegistryFactory', args.vkRegistryTemplate)
    const accQueueFactory = await deployContract(
        'AccQueueFactory', 
        args.accQueueBinary0Template,
        args.accQueueBinaryMaciTemplate, 
        args.accQueueQuinary0Template, 
        args.accQueueQuinaryMaciTemplate, 
        args.accQueueQuinaryBlankSlTemplate
        )
    const signupTokenFactory = await deployContract('SignUpTokenFactory', args.signUpTokenTemplate)
    const signupGatekeeperFactory = await deployContract('SignUpGatekeeperFactory', args.signupGatekeeperTemplate)

    console.log('[+] MaciFactory:', maciFactory)
    console.log('[+] PollFactory:', pollFactory)
    console.log('[+] VkRegistryFactory:', vkRegistryFactory)
    console.log('[+] AccQueueFactory:', accQueueFactory)
    console.log('[+] SignupTokenFactory:', signupTokenFactory)

    return {
        maciFactory,
        pollFactory,
        vkRegistryFactory,
        accQueueFactory,
        signupTokenFactory,
        signupGatekeeperFactory
    }
}