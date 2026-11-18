import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfigDoc extends Document {
  thetaM: number;
  thetaA: number;
  wM: number;
  wA: number;
  dropDelta: number;
  activeBatches: string[];
}

const SystemConfigSchema = new Schema<ISystemConfigDoc>(
  {
    thetaM: { type: Number, default: 5.0 },
    thetaA: { type: Number, default: 7.5 },
    wM: { type: Number, default: 0.6 },
    wA: { type: Number, default: 0.4 },
    dropDelta: { type: Number, default: -1.5 },
    activeBatches: { type: [String], default: ['2026'] },
  },
  { timestamps: true }
);

export default mongoose.models.SystemConfig ||
  mongoose.model<ISystemConfigDoc>('SystemConfig', SystemConfigSchema);