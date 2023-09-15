export interface ContractFactories {
    maciFactory: string
    pollFactory: string 
    vkRegistryFactory: string 
    accQueueFactory: string 
    signupTokenFactory: string
    signupGatekeeperFactory: string
}

export interface DeployFactoriesArgs {
    maciTemplate: string 
    pollTemplate: string 
    signupGatekeeperTemplate: string
    signUpTokenTemplate: string 
    vkRegistryTemplate: string 
    accQueueBinary0Template: string  
    accQueueBinaryMaciTemplate: string 
    accQueueQuinary0Template: string 
    accQueueQuinaryMaciTemplate: string 
    accQueueQuinaryBlankSlTemplate: string 
}