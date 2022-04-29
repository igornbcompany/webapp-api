const { v4: uuidv4 } = require("uuid");
const ethers = require("ethers");
const fs = require("fs");
const path = require("path");

const genesisStatRandomizer = require("../calculations/genesisStatRandomizer");
const { saveHatchingKey } = require("../logic/activitiesLogic");
const { getGenesisNBMonTypes } = require("./genesisNBMonLogic");

const moralisAPINode = process.env.MORALIS_APINODE;
const pvtKey = process.env.PRIVATE_KEY_1;
// rinkeby URL connected with Moralis
const nodeURL = `https://speedy-nodes-nyc.moralis.io/${moralisAPINode}/eth/rinkeby`;
const customHttpProvider = new ethers.providers.JsonRpcProvider(nodeURL);
const genesisNBMonABI = fs.readFileSync(
	path.resolve(__dirname, "../abi/genesisNBMon.json")
);
const genesisABI = JSON.parse(genesisNBMonABI);
const genesisContract = new ethers.Contract(
	process.env.CONTRACT_ADDRESS,
	genesisABI,
	customHttpProvider
);

// hatches the nbmon from an egg and gives it its respective stats
const randomizeHatchingStats = async () => {
	try {
		const key = uuidv4();
		const signer = new ethers.Wallet(pvtKey, customHttpProvider);
		const gender = (await genesisStatRandomizer.randomizeGenesisGender()).toString();
		const rarity = (await genesisStatRandomizer.randomizeGenesisRarity()).toString();
		const genus = (await genesisStatRandomizer.randomizeGenesisGenus()).toString();
		const mutation = (await genesisStatRandomizer.randomizeGenesisMutation(genus)).toString();
		const species = "Origin";
		const fertility = "3000";
		const nbmonStats = [gender, rarity, mutation, species, genus, fertility];

		const types = await getGenesisNBMonTypes(genus);
		const potential = await genesisStatRandomizer.randomizeGenesisPotential(rarity);
		const passives = await genesisStatRandomizer.randomizeGenesisPassives();

		let unsignedTx = await genesisContract.populateTransaction.addValidKey(
			key,
			nbmonStats,
			types,
			potential,
			passives
		);
		let response = await signer.sendTransaction(unsignedTx);
		let minedResponse = await response.wait();

		//Upon successful minting
		await saveHatchingKey(key);

		return {
			response: minedResponse,
			key: key,
		};
	} catch (err) {
		return err;
	}
};

module.exports = {
	randomizeHatchingStats,
};
