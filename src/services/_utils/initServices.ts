import { ServiceClasses, type Services } from '..';
import type { Repositories } from '@/repositories';

export const initServices = (repositories: Repositories) => {
  const services = {} as Services;
  Object.entries(ServiceClasses).forEach(([key, ServiceClass]) => {
    services[key as keyof Services] = new ServiceClass(repositories, services);
  });

  return services;
};
