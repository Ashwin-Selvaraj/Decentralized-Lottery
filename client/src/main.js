import React, { useState, useEffect } from "react";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import config from "./config/config";

const Main = () => {
  const { contract_Address, contract_ABI } = config;
  const [lotteryContract, setLotteryContract] = useState();
  const [signer, setSigner] = useState();
  const [currentOrganizer, setCurrentOrganizer] = useState();
  const [lotteryPot, setLotteryPot] = useState(0);
  const [lotteryParticipants, setLotteryParticipants] = useState([]);
  const [lotteryWinners, setLotteryWinners] = useState([]);
  const [error, setError] = useState();
  const [successMessage, setSuccessMessage] = useState();
  const [currentAddress, setCurrentAddress] = useState();

  // Handler for connecting wallet
  const connectWalletHandler = async () => {
    const web3Modal = new Web3Modal();
    // Web3Modal is a library that simplifies the process of connecting to a user's Ethereum wallet, like MetaMask.
    const connection = await web3Modal.connect();
    const provider = new ethers.BrowserProvider(connection);
    if (provider) {
      const getnetwork = await provider.getNetwork();
      const sepoliaChainId = 11155111;

      if (getnetwork.chainId != sepoliaChainId) {
        alert("please switch to Ethereum's Sepolia network");
        return;
      }

      //sign the transaction
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const contract = new ethers.Contract(
        contract_Address,
        contract_ABI,
        signer
      );
      // Setting the global constants
      setSigner(signer);
      setLotteryContract(contract);
      setCurrentAddress(account);
    } else {
      // MetaMask is not installed
      alert("Please install MetaMask extension first!");
    }
  };

  // Updating the UI values every time the contract values are changed
  useEffect(() => {
    updateState();
  }, [lotteryContract]);

  const updateState = async (winningUpdate = false) => {
    if (lotteryContract) {
      const organizer = await lotteryContract.organizer();
      const pot = await lotteryContract.getCollectedFunds();
      const participants = await lotteryContract.getParticipantsList();
      const lotteryRound = await lotteryContract.lotteryRound();

      for (let i = lotteryRound; i > 0; i--) {
        const winnerAddress = await lotteryContract.lotteryWinners(i);
        if (winnerAddress === "0x0000000000000000000000000000000000000000")
          continue;
        // Put winning message here: if i === lotteryId here then show the winning message with winner address
        if (i === lotteryRound && winningUpdate) {
          setSuccessMessage(
            `${winnerAddress} won ${lotteryPot} Ether! Congratulations 🥳`
          );
        }
        const historyObj = { key: i, address: winnerAddress };
        // Adds the history object only if it doesn't already exist
        if (
          lotteryWinners.filter((e) => e.address === winnerAddress).length === 0
        ) {
          setLotteryWinners((lotteryWinners) => [
            ...lotteryWinners,
            historyObj,
          ]);
        }
      }

      setCurrentOrganizer(organizer);
      setLotteryPot(ethers.formatEther(pot.toString()));
      setLotteryParticipants(participants);
    }
  };

  const participate = async () => {
    if (!signer) {
      // Check if signer is available
      alert("Please connect your wallet first");
      return;
    }
    setError("");
    try {
      const tx = await signer.sendTransaction({
        to: contract_Address, // Lottery contract address
        value: ethers.parseEther("0.01"),
      });
      await tx.wait();
      console.log(
        `The transaction hash for participating in lottery is ${tx.hash}`
      );
      updateState();
    } catch (error) {
      if (error.message.search("Organizer cannot participate") !== -1)
        setError("Organizer cannot participate");
      else if (
        error.message.search(
          "Lottery is not yet started. Please choose an organizer."
        ) !== -1
      )
        setError("Lottery is not yet started. Please choose an organizer.");
      else setError(error.message);
    }
  };

  // Handler for getting results
  const getResults = async () => {
    setError("");
    try {
      setSuccessMessage("Sending transaction... Please wait");
      const tx = await lotteryContract.getLotteryResults();
      await tx.wait();

      let remainingSec = 120;
      const intervalId = window.setInterval(function () {
        setSuccessMessage(`Just ${--remainingSec}s more!`);
      }, 1000);
      setTimeout(() => {
        clearInterval(intervalId);
        updateState(true);
      }, 120_000);
    } catch (error) {
      setSuccessMessage("");
      if (error.message.search("Only the organizer can get the results") !== -1)
        setError("Only the organizer can get the results");
      else if (
        error.message.search("Lottery must have at least 3 participants") !== -1
      )
        setError("Lottery must have at least 3 participants");
      else if (
        error.message.search(
          "Lottery is not yet started. Please choose an organizer."
        ) !== -1
      )
        setError("Lottery is not yet started. Please choose an organizer.");
      else setError(error.message);
    }
  };

  // Handler for setting new organizer
  const setNewOrganizer = async () => {
    setError("");
    setSuccessMessage("");
    try {
      const tx = await lotteryContract.setNewOrganizer();
      await tx.wait();
      updateState();
    } catch (error) {
      if (
        error.message.search(
          "Cannot change organizer in the middle of a lottery"
        ) !== -1
      )
        setError("Cannot change organizer in the middle of a lottery");
      else setError(error.message);
    }
  };

  return (
    <React.Fragment>
      <div className="title-block" style={{ marginTop: "1em" }}>
        <h1 className="name">Decentralized Lottery</h1>
        <button
          style={{ backgroundColor: "dodgerblue" }} // Set margin to override the universal style
          className="metamask-button"
          onClick={connectWalletHandler}
        >
          {currentAddress ? (
            <div>
              connected to {currentAddress.slice(0, 5)} ....{" "}
              {currentAddress.slice(currentAddress.length - 4)}
            </div>
          ) : (
            <div>connect wallet </div>
          )}{" "}
        </button>
      </div>
      <div className="main-menu" style={{ marginTop: "3em" }}>
        <div className="container">
          <p>
            Participate in the lottery by sending exactly <b>0.01 ether</b>
          </p>
          <button className="participate-button" onClick={participate}>
            Participate
          </button>
          {currentAddress && (
            <div>
              <h4 style={{ display: "inline", marginLeft: "0px" }}>
                Your address:
              </h4>
              <p style={{ display: "inline" }}>{currentAddress}</p>
            </div>
          )}
        </div>
        <div className="container middle-container">
          <br />
          <p style={{ marginLeft: "0px" }}>
            <b>Organizer only</b> can get the Lottery Result
          </p>
          <button className="getResult-button" onClick={getResults}>
            Get Result
          </button>
          {currentOrganizer && (
            <div>
              <h4 style={{ display: "inline", marginLeft: "0px" }}>
                Current Organizer:
              </h4>
              <p style={{ display: "inline" }}>{currentOrganizer}</p>
            </div>
          )}
        </div>
        <div className="container">
          <br />
          <p style={{ marginLeft: "0px" }}>
            <b>Only after a lottery round:</b> Set new Organizer
          </p>
          <button className="newManager-button" onClick={setNewOrganizer}>
            Set New Organizer
          </button>
        </div>
        {/* Error preview */}
        <section>
          <div className="error-text">
            <p>{error}</p>
          </div>
        </section>
        {/* Success preview */}
        <section>
          <div className="success-text">
            <p>{successMessage}</p>
          </div>
        </section>
      </div>
      {/* Right side */}
      <div className="right-menu">
        {/* Lottery history */}
        <section className="right-section">
          <div className="card">
            <div className="card-content">
              <div className="content">
                <h2>Lottery History</h2>
                {lotteryWinners.map((item) => {
                  return (
                    <div
                      className="history-entry mt-3"
                      key={`${item.key}-${item.address}`}
                    >
                      <div>Lottery #{item.key.toString()} winner:</div>
                      <div>
                        <a
                          href={`https://sepolia.etherscan.io/address/${item.address}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.address}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        {/* Participants */}
        <section className="right-section">
          <div className="card">
            <div className="card-content">
              <div className="content">
                <h2>Participants ({lotteryParticipants.length})</h2>
                <div>
                  <ul>
                    {lotteryParticipants.map((participant, index) => {
                      return (
                        <li key={`${participant}-${index}`}>
                          <a
                            href={`https://sepolia.etherscan.io/address/${participant}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {participant}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Pot */}
        <section className="right-section">
          <div className="card-pot">
            <div className="card-content">
              <div className="content">
                <h2>Pot</h2>
                <p>{lotteryPot} Ether</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/*Bottom Footer*/}
      <footer className="footer">
        <p>
          &copy; 2024<strong>Decentralized Lottery</strong>a project by Ashwin
        </p>
      </footer>
    </React.Fragment>
  );
};

export default Main;
