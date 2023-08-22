import { ethers } from "hardhat";
import words from "random-words";
import { CorrectSortedBallot } from "../typechain-types";

const BLOCK_GAS_LIMIT = 30000000n;
const WORD_COUNT = 300;
const STEP_SIZE = 5000;

async function main() {
  const ballotFactory = await ethers.getContractFactory("CorrectSortedBallot");
  const proposals = words({ exactly: WORD_COUNT });
  const ballotContract: CorrectSortedBallot = await ballotFactory.deploy(
    proposals.map(ethers.encodeBytes32String)
  );
  await ballotContract.waitForDeployment();
  let completed = false;
  let loop = 0;
  while (!completed) {
    console.log("Sorting proposals");
    console.log(`Currently at the loop number ${++loop}`);
    console.log("Sorting proposals...");
    const sortTx = await ballotContract.sortProposals(STEP_SIZE);
    console.log("Awaiting confirmations");
    const sortReceipt = await sortTx.wait();
    console.log("Operation completed");
    const gasUsed = sortReceipt?.gasUsed ?? 0n;
    const gasPrice = sortReceipt?.gasPrice ?? 0n;
    const txFee = gasUsed * gasPrice;
    const percentUsed = Number((gasUsed * 10000n) / BLOCK_GAS_LIMIT) / 100;
    console.log(
      `${gasUsed} units of gas used at ${ethers.formatUnits(
        gasPrice,
        "gwei"
      )} GWEI effective gas price, total of ${ethers.formatUnits(
        txFee
      )} ETH spent. This used ${percentUsed} % of the block gas limit`
    );
    const [sortedWords, savedIndex, swaps] = await Promise.all([
      ballotContract.sortedWords(),
      ballotContract.savedIndex(),
      ballotContract.swaps(),
    ]);
    console.log(
      `So far it has sorted ${sortedWords} words. Currently at position ${savedIndex}, where the current loop found ${swaps} words out of place `
    );
    completed = await ballotContract.sorted();
    console.log(
      `The sorting process has${completed ? " " : " not "}been completed`
    );
    if (completed) {
      const props = [];
      for (let index = 0; sortedWords > index; index++) {
        const prop = await ballotContract.proposalsBeingSorted(index);
        props.push(ethers.decodeBytes32String(prop.name));
      }
      console.log(`Passed ${WORD_COUNT} proposals:`);
      console.log(proposals.join(", "));
      console.log(`Sorted ${sortedWords} proposals: `);
      console.log(props.join(", "));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
