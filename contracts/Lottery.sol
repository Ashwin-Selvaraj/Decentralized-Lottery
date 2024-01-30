// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

//contract_Address = 0xCE4Cf5ebd4049b052c06942EeCA22e2c79620CD0
//configrations for vrf system of sepolia test net
//     vrfcoordinator - 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
//     //subscription - 8381
//     //keyhash- 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
//     //interval - 120
//     //entranceFee - 100
//     //callbackGasLimit - 2,500,000

contract ModifiedLottery is VRFConsumerBaseV2 {
    address public organizer;
    address payable[] private participants;
    uint public lotteryRound;
    mapping(uint => address payable) public lotteryWinners;

    enum LotteryState {
        OPEN,
        CLOSED
    }
    event RoundCompleted(string message, uint prizeAmount, address payable winner);

    LotteryState private state;

    // For randomness
    event RandomNumberGenerated(string message, uint number);
    VRFCoordinatorV2Interface private vrfCoordinator;

    constructor()
        VRFConsumerBaseV2(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625)
    {
        organizer = msg.sender;
        state = LotteryState.OPEN;
        lotteryRound = 1;

        vrfCoordinator = VRFCoordinatorV2Interface(
            0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625
        );
    }

    receive() external payable {
        require(state == LotteryState.OPEN, "Lottery is not yet started. Please choose an organizer.");
        require(msg.sender != organizer, "Organizer cannot participate");
        require(msg.value == 0.01 * 10**18, "Must send exactly 0.01 ether to participate");

        if (!hasAlreadyParticipated(msg.sender))
            participants.push(payable(msg.sender));
    }

    function getLotteryResults() public {
        require(state == LotteryState.OPEN, "Lottery is not yet started. Please choose an organizer.");
        require(msg.sender == organizer, "Only the organizer can get the results");
        require(participants.length >= 3, "Lottery must have at least 3 participants");

        requestRandomNumber();
    }

    function requestRandomNumber() private returns (uint requestId) {
        return
            vrfCoordinator.requestRandomWords(
                0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c, // keyhash
                8381, // Subscription Id
                3, // Request Confirmations
                2500000, // Callback Gas Limit
                1 // Number of random numbers to be generated
            );
    }

    function fulfillRandomWords(
        uint256,
        uint256[] memory randomResults
    ) internal override {
        emit RandomNumberGenerated("Received a truly random number", randomResults[0]);

        // Selecting the winner
        uint randomIndex = randomResults[0] % participants.length;
        address payable winner = participants[randomIndex];

        // Updating the lottery history
        lotteryWinners[lotteryRound] = participants[randomIndex];

        // Resetting the lottery
        organizer = address(0);
        participants = new address payable[](0);
        state = LotteryState.CLOSED;

        winner.transfer(address(this).balance);

        emit RoundCompleted(
            "A lottery round has ended. Here are the winning amount (in ether) and the winner: ",
            address(this).balance / 10**18,
            winner
        );
    }

    function setNewOrganizer() public {
        require(state == LotteryState.CLOSED, "Cannot change organizer in the middle of a lottery");
        organizer = msg.sender;
        state = LotteryState.OPEN;
        lotteryRound++;
    }

    function getParticipantsList() public view returns (address payable[] memory) {
        return participants;
    }

    function getCollectedFunds() public view returns (uint) {
        return address(this).balance;
    }

    function hasAlreadyParticipated(address participant)
        private
        view
        returns (bool)
    {
        for (uint i = 0; i < participants.length; i++) {
            if (participants[i] == participant) {
                return true;
            }
        }
        return false;
    }
}
