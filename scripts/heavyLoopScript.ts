import { ethers } from "hardhat";
import words from "random-words";
import { SortedBallot } from "../typechain-types";

const HARDCODED_SAFE_LOOP_LIMIT = 1000;
const BLOCK_GAS_LIMIT = 30000000n;

async function main() {
  const ballotFactory = await ethers.getContractFactory("SortedBallot");
  const wordDatabase = words({ exactly: HARDCODED_SAFE_LOOP_LIMIT * 100 });
  let wordCount = 100;
  try {
    for (let loop = 0; loop < HARDCODED_SAFE_LOOP_LIMIT; loop++) {
      console.log(`Loop ${loop}: Testing with ${wordCount} words`);
      const proposals = wordDatabase.slice(0, wordCount);
      const ballotContract: SortedBallot = await ballotFactory.deploy(
        proposals.map(ethers.encodeBytes32String)
      );
      await ballotContract.waitForDeployment();
      console.log(`Passed ${wordCount} proposals:`);
      console.log(proposals.join(", "));
      console.log("Sorting proposals now...");
      const sortTx = await ballotContract.sortProposals();
      console.log("Awaiting confirmations");
      const sortReceipt = await sortTx.wait();
      console.log("Completed");
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
      const props = [];
      for (let index = 0; index < wordCount; index++) {
        const prop = await ballotContract.proposals(index);
        props.push(ethers.decodeBytes32String(prop.name));
      }
      console.log("Sorted proposals: ");
      console.log(props.join(", "));
      wordCount +=
        percentUsed > 95
          ? 1
          : percentUsed > 90
          ? 2
          : percentUsed > 75
          ? 10
          : 20;
    }
  } catch (error) {
    console.log(
      `Congratulations! You broke the block limit while sorting ${wordCount} words in a Smart Contract`
    );
    console.log({ error });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
