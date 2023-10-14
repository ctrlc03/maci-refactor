export interface TreeDepths {
    intStateTreeDepth: number
    messageTreeDepth: number
    messageTreeSubDepth: number
    voteOptionTreeDepth: number
}

export interface BatchSizes {
    tallyBatchSize: number
    subsidyBatchSize: number
    messageBatchSize: number
}

export interface MaxValues {
    maxUsers: number
    maxMessages: number
    maxVoteOptions: number
}