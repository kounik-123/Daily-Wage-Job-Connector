import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true }
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export default mongoose.model('Wishlist', wishlistSchema);
