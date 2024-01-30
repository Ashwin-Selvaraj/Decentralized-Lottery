require("dotenv").config();
const ABI =
  require("../artifacts/contracts/Lottery.sol/ModifiedLottery.json").abi;
const config = {
  network: process.env.NETWORK,
  privateKey: process.env.PRIVATE_KEY,
  contract_ABI: ABI,
  contract_Address: "0x69D924eD8a80F3bc4d5F6498Ff7a15c38f3Ee735", //_Sepolia
};

module.exports = config;
