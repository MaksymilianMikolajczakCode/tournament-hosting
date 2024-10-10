import mongoose from "mongoose";

const Schema = mongoose.Schema;

const divisionSchema = new Schema({
    finishDate: {
    type: Date,
  },
  matches: [{
    type: Schema.Types.ObjectId,
    ref: 'Match'
  }],
  DivisionNumber: {
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

const Division = mongoose.models.Division || mongoose.model("Division", divisionSchema);

export default Division;
