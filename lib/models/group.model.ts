import mongoose from "mongoose";

const Schema = mongoose.Schema;

const groupSchema = new Schema({
    finishDate: {
    type: Date,
  },
  matches: [{
    type: Schema.Types.ObjectId,
    ref: 'Match'
  }],
  GroupNumber: {
    type: String
  },
  players: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  competition: {
    type: Schema.Types.ObjectId,
    ref: "Competition"
  }
});

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Group;