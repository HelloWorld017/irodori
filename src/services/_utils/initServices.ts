import { ServiceClasses, type Services } from '..';
import type { Repositories } from '@/repositories';

export const initServices = (repositories: Repositories) => {
  const services = {} as Services;
  const assignService = <K extends keyof Services>(key: K, service: Services[K]) => {
    services[key] = service;
  };

  (Object.keys(ServiceClasses) as Array<keyof typeof ServiceClasses>).forEach(key => {
    const ServiceClass = ServiceClasses[key] as new (
      repositories: Repositories,
      services: Services
    ) => Services[typeof key];

    assignService(key, new ServiceClass(repositories, services));
  });

  return services;
};
