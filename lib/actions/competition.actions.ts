"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import Competition from "../models/competition.model";
import Match from "../models/match.model";
import Round from "../models/round.model";

export async function fetchCompetitions(pageNumber = 1, pageSize = 20) {
  connectToDB();

  // Calculate the number of posts to skip based on the page number and page size.
  const skipAmount = (pageNumber - 1) * pageSize;

  // Create a query to fetch the posts that have no parent (top-level threads) (a thread that is not a comment/reply).
  const competitionsQuery = Competition.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "owner",
      model: User,
    })
    // .populate({
    //   path: "children", // Populate the children field
    //   populate: {
    //     path: "author", // Populate the author field within children
    //     model: User,
    //     select: "_id name parentId image", // Select only _id and username fields of the author
    //   },
    // });

  // Count the total number of top-level posts (threads) i.e., threads that are not comments.
  const totalCompetitionsCount = await Competition.countDocuments({
    parentId: { $in: [null, undefined] },
  }); // Get the total count of posts

  const competitions = await competitionsQuery.exec();
  const reversed = competitions.reverse()
  const isNext = totalCompetitionsCount > skipAmount + competitions.length;

  return { competitions, isNext };
}

interface Params {
  title: string,
  owner: string,
  regulationsLink: string,
  regulations: String,
  details: String,
  startDate: Date,
  // type: String,
  path: string,
  image: string,
}

export async function createCompetition({ title, owner, regulationsLink, regulations, details, startDate, image, path}: Params
) {
  try {
    connectToDB();
    const createdCompetition = await Competition.create({
      title,
      owner,
      regulationsLink,
      regulations,
      details,
      startDate,
      image,
      // type
    });

    // Update User model
    await User.findByIdAndUpdate(owner, {
      $push: { owner: createdCompetition._id },
    });

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create competition: ${error.message}`);
  }
}

interface Params2 {
  title: string,
  owner: string,
  regulationsLink: string,
  regulations: String,
  details: String,
  startDate: Date,
  // type: String,
  path: string,
  image: string,
  id: string,
}

export async function editCompetition({title, owner, details, regulations, regulationsLink, startDate, image, path, id}: Params2) {
  connectToDB();
  
  try {
    await Competition.findByIdAndUpdate(id, {
    $push: {title, owner, details, regulations, regulationsLink, startDate, image}
  })} catch (err) {
    console.error("Error while editing competition:", err);
    throw new Error("Unable to edit competition");
  }
  revalidatePath(path);
}

export async function JoinCompetition({userId, competitionId} : { userId : string, competitionId: string}) {
  connectToDB();
  
  try {
    await Competition.findByIdAndUpdate(competitionId, { 
      $push: { players: userId}
    })

    await User.findByIdAndUpdate(userId, {
        $push: { competitions: competitionId },
      });
  } catch (err) {
    console.error("Error while joining competition:", err);
    throw new Error("Unable to join competition");
  }
}


export async function fetchCompetitionById(competitionId: string) {
  connectToDB();

  try {
    const competitionQuery = Competition.findById(competitionId)
    .lean()
      .populate({
        path: "owner",
        model: User,
        select: "image username discord id _id"
      }) // Populate the author field with _id and username
      .populate({
        path: "players",
        model: User,
        select: "image username"
      })
      .populate({
        path: "round",
        model: Round,
        populate: {
          path: "matches",
          model: Match,
          populate: {
            path: "players",
            model: User
          }
        }
      })
    const competition = await competitionQuery.exec()
    return competition;
  } catch (err) {
    console.error("Error while fetching competition:", err);
    throw new Error("Unable to fetch competition");
  }
}


export async function generateBracket(competitionId: string, startDate: Date, path: string) {
  connectToDB();

  try {
    const competitionQuery = Competition.findById(competitionId)
      .populate({
        path: "players",
        model: User,
        select: "image username"
      })
      const competition = await competitionQuery.exec()
      const shuffle = (array: string[]) => { 
        for (let i = array.length - 1; i > 0; i--) { 
          const j = Math.floor(Math.random() * (i + 1)); 
          [array[i], array[j]] = [array[j], array[i]]; 
        } 
        return array; 
      }; 
      const shuffledPlayers = shuffle(competition.players)
      const  knownBrackets = [2,4,8,16,32,64,128,256,512,1024]
      const base = knownBrackets.find(function( base: number) { return base >= competition.players.length})

      const rounds = Math.log(base)/Math.log(2)
      // const empty = base - competition.players.value
      for (let i = 1; i <= rounds; i += 1) {
        const newDate = new Date(startDate);
        newDate.setUTCDate(newDate.getUTCDate() + 7 * i);
      
        try {
          const round = await Round.create({
            roundNumber: `1/${base / Math.pow(2, i)}`,
            competition: competition, // Ensure competition is a valid reference or ID
            bestOf: 1,
            finishDate: newDate,
          });
          // Assuming competition is a valid reference or ID
          await Competition.findByIdAndUpdate(
            competitionId,
            { $push: { round: round } }, // Assuming round is stored as a reference or ID
            { new: true } // To return the updated competition document
          );
        } catch (error) {
          console.error(`Error creating round: ${error}`);
        }
      }
      

      // if(empty>0)
      for (let i = 0; i < competition.players.length; i += 2) {
        const teamA = shuffledPlayers[i];
        const teamB = shuffledPlayers[i + 1];
        const matchNumber = (i + 2) / 2;
      
        const match = await Match.create({
          players: [teamA, teamB],
          matchNumber: matchNumber,
          competition: competitionId,
          NoR1Games: base / 2,
        });
        await User.findOneAndUpdate({_id: teamA._id},{ $push: {matches: match}})
        await User.findOneAndUpdate({_id: teamB._id},{ $push: {matches: match}})

        const roundToUpdate = await Round.findOne({
          competition: competitionId,
          roundNumber: `1/${(base/2)}`,
        });
      
        if (roundToUpdate) {
          roundToUpdate.matches.push(match);
          await roundToUpdate.save(); // Save the updated round
        } else {
          console.error("Round not found for update");
        }
      }
      
      const rounds = Math.log(base)/Math.log(2)
      for (let i = 2; i <= rounds; i+=1 ) {
        for (let j = 1; j<= base/(2*i); j+=1) { 
          const previousGames = (base*(1-Math.pow(0.5,(i-1))))
          const matchNumber = previousGames + j
          const match = await Match.create({
            matchNumber: matchNumber,
            roundNumber: i,
            competition: competitionId,
            NoR1Games: base/2
          })
          // await Competition.findByIdAndUpdate(competitionId, {
          //   $push: { bracket: match },
          // });
          await Round.findOneAndUpdate({ competition: competitionId, roundNumber: `1/${(base/Math.pow(2,i))}`},{ $push: { matches: match}})
        }
      }
      revalidatePath(path)
  } catch (err) {
    console.error("Error while generating competition:", err);
    throw new Error("Unable to generate competition");
  }
}

export async function generateLoserBracket(competitionId: string, startDate: Date, path: string) {
  connectToDB()

  try {
    const competitionQuery = Competition.findById(competitionId)
      .populate({
        path: "players",
        model: User,
        select: "image username"
      })
    const competition = await competitionQuery.exec()
    const  knownBrackets = [2,4,8,16,32,64,128,256,512,1024]
    const base = knownBrackets.find(function( base: number) { return base >= competition.players.length})
    const rounds = (Math.log2(base)*2)-2
    for (let i = 1; i <= rounds; i += 1) {
      const newDate = new Date(startDate);
      newDate.setUTCDate(newDate.getUTCDate() + 7 * i);
    
      try {
        const round = await Round.create({
          roundNumber: `1/${base / Math.pow(2, i)}`,
          competition: competition, // Ensure competition is a valid reference or ID
          bestOf: 1,
          finishDate: newDate,
        });
        // Assuming competition is a valid reference or ID
        await Competition.findByIdAndUpdate(
          competitionId,
          { $push: { round: round } }, // Assuming round is stored as a reference or ID
          { new: true } // To return the updated competition document
        );
      } catch (error) {
        console.error(`Error creating round: ${error}`);
      }
    }
    for (let i = 1; i <= rounds; i+=1 ) {
      for (let j = 1; j<= base/(2*i); j+=1) { 
        const previousGames = (base*(1-Math.pow(0.5,(i-1))))
        const matchNumber = previousGames + j
        const match = await Match.create({
          matchNumber: matchNumber,
          roundNumber: i,
          competition: competitionId,
          NoR1Games: base/2
        })
        // await Competition.findByIdAndUpdate(competitionId, {
        //   $push: { bracket: match },
        // });
        await Round.findOneAndUpdate({ competition: competitionId, roundNumber: `1/${(base/Math.pow(2,i))}`},{ $push: { matches: match}})
      }
    }
  }
  catch (error) {
    console.error(`Error creating round: ${error}`);
  }
}

export async function fetchMatch(matchId: string) {
  connectToDB();

  try {
    const matchQuery = Match.findById(matchId)
    .lean()
    .populate({
      path: "players",
      model: User,
      select: "username _id image"
    })
    .populate({
      path: "competition",
      model: Competition,
      select: "owner"
    })
    .populate({
      path: "games",
      populate : {path : "winner", model: User, select: "username"}
    })
    .populate({
      path: "games",
      populate : {path : "loser", model: User, select: "username"}
    })

    const match = await matchQuery.exec()
    return match;
  } catch (err) {
    console.error("Error while fetching match:", err);
    throw new Error("Unable to fetch match");
  }
}

interface Params2 {
  matchId: string,
  winner: string,
  loser: string,
  winnerCastle: String,
  loserCastle: String,
  winnerTrade: Number,
  loserTrade: Number,
  path: string,
  competition: string,
  matchNumber: number,
  NoR1Games: number,
  description: string,
}

export async function updateMatch({
  matchId,
  winner,
  loser,
  winnerCastle,
  winnerTrade,
  loserCastle,
  loserTrade,
  competition,
  matchNumber,
  NoR1Games,
  description,
  path
}: Params2) {
  // Connect to the database
  connectToDB();

  try {
    if (matchNumber % 2 === 0) {
      const newMatch = await Match.findOneAndUpdate(
        { competition: competition, matchNumber: matchNumber / 2 + NoR1Games },
        {
          $push: { players: winner }
        }
      );

      await User.findOneAndUpdate({winner},{ $push: {matches: newMatch}})
      await Match.findOneAndUpdate(
        { _id: matchId },
        {
          winner: winner,
          competition: competition,
          $push: {
            games: {
              winner: winner,
              loser: loser,
              winnerTrade: winnerTrade,
              winnerCastle: winnerCastle,
              loserTrade: loserTrade,
              loserCastle: loserCastle,
              description: description
            }
          }
        }
      );
    } else {
      await Match.findOneAndUpdate(
        { competition: competition, matchNumber: (matchNumber + 1) / 2 + NoR1Games },
        {
          $push: { players: winner }
        }
      );
      await User.findOneAndUpdate({winner},{ $push: {matches: newMatch}})
      await Match.findOneAndUpdate(
        { _id: matchId },
        {
          winner: winner,
          competition: competition,
          $push: {
            games: {
              winner: winner,
              loser: loser,
              winnerTrade: winnerTrade,
              winnerCastle: winnerCastle,
              loserTrade: loserTrade,
              loserCastle: loserCastle,
              description: description
            }
          }
        }
      );
    }
    revalidatePath(path);
  } catch (err) {
    console.error("Error while updating match:", err);
    throw new Error("Unable to update match");
  }
}
