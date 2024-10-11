"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import Competition from "../models/competition.model";
import Match from "../models/match.model";
import Division from "../models/division.model";

interface Params {
    title: string,
    players: Array<string>,
  }

export async function createDivision({ title, players}: Params
) {
  try {
    connectToDB();
    const createdDivision = await Division.create({
      title,
      players
    });

  } catch (error: any) {
    throw new Error(`Failed to create competition: ${error.message}`);
  }
}

export async function editDivision({}) {
    
}