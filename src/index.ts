import express, { Express, Request, Response } from "express";

import bodyParser from "body-parser";
import cors from "cors";
import { ethers } from "ethers";

import dotenv from "dotenv";

dotenv.config();

const ToTheMooon = require("../artifacts/contracts/ToTheMooon.sol/ToTheMooon.json");
const Tournament = require("../artifacts/contracts/Tournament.sol/Tournament.json");

const app: Express = express();
const port = process.env.PORT || 8000;

// middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.get("/current_tournament", async (req: Request, res: Response) => {
  const toTheMooon = fetchToTheMooon();

  const tId = await toTheMooon.currentTournamentId();

  const tournament = await fetchTournament(tId);

  const name = await tournament.name();
  const timeLimit = await tournament.timeLimit();
  let startTime = await tournament.startTime();
  const info = await tournament.getRewardInfo();
  const id = await tournament.id();
  const joiningFee = ethers.utils.formatEther(info[1]).toString();
  const playersJoined = info[2].toNumber();
  const { prizePool, commissionPercentage, isSponsored } = info[0];
  const endsInNum = startTime.toNumber() + timeLimit.toNumber();
  const endsIn = new Date(endsInNum * 1000);

  const now = new Date();

  const currentTournament = {
    joiningFee,
    playersJoined,
    isSponsored,
    name,
    endsIn,
    id: id.toString(),
    commissionPercentage: commissionPercentage.toNumber(),
    prizePool: ethers.utils.formatEther(prizePool),
  };

  res.send({
    ...currentTournament,
  });
});

app.get("/create_tournament", async (req: Request, res: Response) => {
  const toTheMooon = fetchToTheMooon();

  try {
    const tId = await toTheMooon.currentTournamentId();
    const success = await endCurrentTournament();

    if (!success) {
      res.send({
        error: "Tournament still live",
      });

      return;
    }

    const commissionPercentage = 10;

    const tx1 = await toTheMooon.createTournament(
      "Tournament #" + (parseInt(tId) + 1),
      [false, 20, 100, "", commissionPercentage * 100]
    );

    await tx1.wait();

    console.log(
      "await toTheMooon.currentTournamentId(): ",
      await toTheMooon.currentTournamentId()
    );

    const tAtId = await toTheMooon.tournaments(
      await toTheMooon.currentTournamentId()
    );

    await joinTournament();

    res.send({
      success: "Created Tournament successfully",
      ...tAtId,
    });
  } catch (e: any) {
    console.log(e.error.reason);
    res.send({
      error: e.error.reason,
    });
  }
});

app.post("/record_score", async (req: Request, res: Response) => {
  const { score, address } = req.body;

  console.log(req.body);

  const toTheMooon = fetchToTheMooon();

  try {
    const tId = await toTheMooon.currentTournamentId();

    const tournament: any = await fetchTournament(tId);

    const {
      attemptsLeft: prevAttemptsLeft,
      unclaimedPrize,
      highscore,
    } = await tournament.playerStatsMap(address);

    const tx = await tournament.recordScore(address, score);

    const { attemptsLeft } = await tournament.playerStatsMap(address);

    await tx.wait();

    res.status(201).send({
      tId,
      score,
      address,
      prevAttemptsLeft: prevAttemptsLeft.toString(),
      attemptsLeft: attemptsLeft.toString(),
      unclaimedPrize: unclaimedPrize.toString(),
      highscore: highscore.toString(),
    });
  } catch (e: any) {
    console.log(e);

    res.status(400).send({
      reason: e.error.error.error.data.message,
    });
  }
});

app.get("/join_tournament", async (req: Request, res: Response) => {});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

async function joinTournament() {
  const tournament = await fetchTournament(
    await fetchToTheMooon().currentTournamentId()
  );

  const tx = await tournament.joinTournament({
    value: await tournament.joiningFees(),
  });

  await tx.wait();

  return;
}

async function endCurrentTournament() {
  const toTheMooon = fetchToTheMooon();
  try {
    const tId = await toTheMooon.currentTournamentId();
    const tournament = await fetchTournament(tId);

    const timeLimit = await tournament.timeLimit();
    let startTime = await tournament.startTime();

    let now = new Date().getTime();
    const endsInNum = startTime.toNumber() + timeLimit.toNumber();
    const endsAt = new Date(endsInNum * 1000).getTime();

    if (now > endsAt) {
      console.log("Ending tournament: ", tId);

      await tournament.endTournament();

      return true;
    }

    return false;
  } catch (e: any) {
    console.log("Error: ", e.reason);

    return false;
  }
}

const fetchTournament = async (id: string) => {
  const toTheMoon = fetchToTheMooon();

  const tAtId = await toTheMoon.tournaments(id);

  const signer = getSigner();

  const tournament = new ethers.Contract(
    tAtId.contractAddress,
    Tournament.abi,
    signer
  );

  return tournament;
};

const fetchToTheMooon = () => {
  //const toTheMooonAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const toTheMooonAddress = "0xe604B496F10CBdAA68412Ea7e015630C6D6C3c49";

  const signer = getSigner();

  const toTheMooon = new ethers.Contract(
    toTheMooonAddress,
    ToTheMooon.abi,
    signer
  );

  return toTheMooon;
};

function getSigner() {
  //const rpcUrl = "http://127.0.0.1:8545/";
  const rpcUrl = "https://rpc-mumbai.maticvigil.com";

  //Hardhat ac 1
  // const privateKey =
  //   "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  //
  const privateKey: any = process.env.PRIVATE_KEY;

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const signer = new ethers.Wallet(privateKey, provider);

  return signer;
}
