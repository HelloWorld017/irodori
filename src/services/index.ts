import { SyncService } from './SyncService';

export type Services = {
  [K in keyof typeof ServiceClasses]: InstanceType<(typeof ServiceClasses)[K]>;
};

export const ServiceClasses = {
  sync: SyncService,
};
