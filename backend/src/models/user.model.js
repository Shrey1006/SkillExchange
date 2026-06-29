import mongoose from "mongoose";
import bcrypt from "bcrypt";

const creditPurchaseSchema = new mongoose.Schema(
  {
    credits: { type: Number, required: true, min: 1 },
    amountInr: { type: Number, required: true, min: 100 },
    paymentId: { type: String, default: "" },
    razorpayOrderId: { type: String, default: "" },
    status: { type: String, enum: ["success", "failed"], default: "success" },
  },
  { _id: false, timestamps: true },
);

const unlockTransactionSchema = new mongoose.Schema(
  {
    contentType: { type: String, enum: ["video", "doc"], required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    cost: { type: Number, required: true, min: 0 },
    reward: { type: Number, default: 0, min: 0 },
    netDeduction: { type: Number, required: true, min: 0 },
  },
  { _id: false, timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    skillsoffered: {
      type: [String],
      default: [],
    },

    skillswanted: {
      type: [String],
      default: [],
    },

    credits: {
      type: Number,
      default: 50,
      min: 0,
    },

    rating: {
      type: Number,
      default: 0,
    },
    gender: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    purchasedSkills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    purchasedDocs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notes",
      },
    ],
    creditPurchases: {
      type: [creditPurchaseSchema],
      default: [],
    },
    unlockTransactions: {
      type: [unlockTransactionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// HASH BEFORE SAVE
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// COMPARE PASSWORD
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
