require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@typechain/hardhat");
require('solidity-docgen');

const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC || "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const config = {
	defaultNetwork: 'hardhat',
	solidity: {
		version: "0.8.19",
		settings: {
			optimizer: {
				enabled: true
			}
		}
	},
	networks: {
		hardhat: {
			chainId: 1337,
			accounts: { count: 30, mnemonic: WALLET_MNEMONIC }
		},
		// mainnet: {
		// 	chainId: 1
		// }
	},
	paths: {
		tests: "./test",
		artifacts: "./artifacts"
	}
}

export default config 