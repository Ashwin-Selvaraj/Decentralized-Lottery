const { ethers } = require("ethers");
const config = require("../config/config");
const cors = require("cors");

(async () => {
  const { privateKey, contract_Address, contract_ABI } = config;
  const provider = new ethers.JsonRpcProvider(
    "https://sepolia.infura.io/v3/0fba3fdf4179467ba9832ac74d77445c"
  );
  // provoider for Matic testnet
  // const provider = new ethers.JsonRpcProvider('https://autumn-falling-firefly.matic-testnet.quiknode.pro/c8e3ff914ff86361fd66c6de0e7aed3c878963fb/')
  // provoider for Scroll sepolia testnet
  // const provider = new ethers.JsonRpcProvider('https://silent-thrilling-frost.scroll-testnet.quiknode.pro/028364d65d7818e04d58c37105ccc9e342e48c54/')
  const wallet = new ethers.Wallet(privateKey, provider);
  const express = require("express");
  const app = express();
  const port = 3001;

  const lottery = new ethers.Contract(contract_Address, contract_ABI, wallet);
  app.use(express.json());
  app.use(cors());

  app.get("/", (req, res) => {
    res.send("Welcome to your Express.js application");
  });

  // GET method to retrieve the Organizer from the Lottery contract
  app.get("/api/organizer", async (req, res) => {
    try {
      const organizer = await lottery.organizer();
      console.log(`Organizer : ${organizer}`);
      res.status(200).json({
        organizer,
        message: `"Organizer: ${organizer}" is fetched successfully from blockchain`,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });
  // GET method to retrieve the lottery round from the Lottery contract
  app.get("/api/lotteryRound", async (req, res) => {
    try {
      const lotteryRound = await lottery.lotteryRound();
      console.log(`Lottery Round : ${lotteryRound.toString()}`);
      res.status(200).json({
        lotteryRound: lotteryRound.toString(),
        message: `"Lottery Round: ${lotteryRound}" is fetched successfully from blockchain`,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // GET method to check the lottery winners of previous lottery rounds in Lottery contract
  app.get("/api/lotteryWinners/:lotteryRound", async (req, res) => {
    try {
      const lotteryRound = req.params.lotteryRound;
      // Call the 'lotteryWinners' mapping on the VCDAO contract
      const winner = await lottery.lotteryWinners(lotteryRound);
      if (winner.toString() == "0x0000000000000000000000000000000000000000") {
        const zeroAddressError = new Error(
          `The Lottery round ${lotteryRound} is not completed and winner is not declared`
        );
        zeroAddressError.name = "ZeroAddressError";
        throw zeroAddressError;
      }
      console.log(
        `Lottery Winner for round ${lotteryRound} is ${winner.toString()}`
      );
      // Respond with the lotteryWinners result
      res.status(200).json({
        winner: winner.toString(),
        message: `Lottery Winner for round ${lotteryRound} is ${winner.toString()}`,
      });
    } catch (error) {
      // Handle errors and respond with an error message
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // GET method to retrieve the lottery participants list from the Lottery contract
  app.get("/api/getParticipantsList", async (req, res) => {
    try {
      const Participants = await lottery.getParticipantsList();
      Participants.map((participant) => {
        console.log(`${participant}`);
      });

      res.status(200).json({
        Participants,
        message: `"Participants: ${Participants}" is fetched successfully from blockchain`,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // GET method to retrieve the lottery's Collected Funds list from the Lottery contract
  app.get("/api/getCollectedFunds", async (req, res) => {
    try {
      const totalFunds = await lottery.getCollectedFunds();
      console.log(`The total amount collected for this round is ${totalFunds}`);

      res.status(200).json({
        totalFunds: totalFunds.toString(),
        message: `"Total Fund: ${totalFunds}" is fetched successfully from blockchain`,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });

  /*   This is a private function
  // GET method to check a person has already participated in the Lottery
  app.get("/api/hasAlreadyParticipated/:participant", async (req, res) => {
    try {
      const participantAddress = ethers.utils.getAddress(req.params.participant);
      const AlreadyParticipated = await lottery.hasAlreadyParticipated(
        participantAddress
      );

      if (AlreadyParticipated) {
        console.log(`The Participant ${participantAddress} has already participated`);
      } else {
        console.log(`The Participant ${participantAddress} is a new member`);
      }

      res.status(200).json({
        AlreadyParticipated,
        message: `The status of the participant ${participantAddress} is fetched successfully from blockchain`,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });*/

  // POST method to handle participation in the Lottery
  app.post("/api/participate", async (req, res) => {
    try {
      const signer = req.body.signer;
      const lottery1 = new ethers.Contract(
        contract_Address,
        contract_ABI,
        signer
      );
      const tx = await signer.sendTransaction({
        to: contract_Address, // Lottery contract address
        value: ethers.parseEther("0.01"),
      });
      await tx.wait();
      console.log(signer);
      res.status(200).json({
        signer,
        message: `"${signer.address}" is succesfully participated in the lottery`,
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/getLotteryResults", async (req, res) => {
    try {
      // Check if the requester is the organizer
      // const requesterAddress = req.headers["from"]; // Assuming the requester's Ethereum address is sent in the headers
      // const organizer = await lottery.organizer();
      // if (requesterAddress !== organizer) {
      //     throw new Error("Only the organizer can get the results");
      // }

      // Check if there are at least 3 participants
      const participantList = await lottery.getParticipantsList();
      const participantCount = participantList.length;
      if (participantCount < 3) {
        throw new Error("Lottery must have at least 3 participants");
      }

      // Trigger the function getLotteryResults
      await lottery.getLotteryResults();
      res.status(200).json({
        message: "Random number request initiated. Wait for the result.",
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // GET method to set a new organizer in the Lottery contract
  app.post("/api/setNewOrganizer", async (req, res) => {
    try {
      // Set the new organizer, update the state, and increment the lottery round
      await lottery.setNewOrganizer();
      res.status(200).json({
        message: "New organizer set successfully.",
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ error: error.message });
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
})();
