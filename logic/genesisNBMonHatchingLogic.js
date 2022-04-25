const { v4: uuidv4 } = require('uuid');
const ethers = require("ethers");
const fs = require("fs");
const path = require("path");

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

const genesisStatRandomizer = require("../calculations/genesisStatRandomizer");
const { getGenesisNBMonTypes } = require("./genesisNBMonLogic");
const { addToActivities } = require("../logic/activitiesLogic");

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
        const nbmonStats = [gender, rarity, genus, mutation, species, fertility];
        const types = await getGenesisNBMonTypes(genus);
        const potential = await genesisStatRandomizer.randomizeGenesisPotential(rarity);
        const passives = await genesisStatRandomizer.randomizeGenesisPassives();

        let unsignedTx = await genesisContract
            .populateTransaction.addValidKey(
                key, 
                nbmonStats, 
                types, 
                potential, 
                passives
            );
        let response = await signer.sendTransaction(unsignedTx);
        let minedResponse = await response.wait();

        //Turns response to string, and turn it back to JSON
		//This is done because for some reason response is a ParseObject and not a JSON
		const jsonResponse = JSON.parse(JSON.stringify(response));
		//Read about ParseObject: https://parseplatform.org/Parse-SDK-JS/api/master/Parse.Object.html
		//Parseplatform is used by Moralis' DB

		//Upon successful minting
		await addToActivities(
			jsonResponse.hash,
			"genesisHatching",
			"eth",
			0
		);

		return {
            response: minedResponse,
            key: key
        };
    } catch (err) {
        return err;
    }
}

const getFertilityDeduction = async (rarity) => {
    switch (rarity) {
        case "Common":
            return 1000;
        case "Uncommon":
            return 750;
        case "Rare":
            return 600;
        case "Epic":
            return 500;
        case "Legendary":
            return 375;
        case "Mythical":
            return 300;
    }
}

module.exports = {
    randomizeHatchingStats,
    getFertilityDeduction
};