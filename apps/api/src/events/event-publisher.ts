import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub, type Topic } from '@google-cloud/pubsub';
import type { Env } from '../config/env.validation.js';

export interface DomainEvent {
  type: string;
  // Clé d'idempotence, copiée dans les attributs du message.
  id: string;
  data: object;
  // Attributs Pub/Sub : filtrables par les abonnements sans lire le corps.
  attributes?: Record<string, string>;
}

// Abstraction de la publication : Pub/Sub en production, rien si aucun topic
// n'est configuré (développement local, tests).
export abstract class EventPublisher {
  // Renvoie l'identifiant du message, ou null s'il n'a pas été publié.
  abstract publish(event: DomainEvent): Promise<string | null>;
}

@Injectable()
export class PubSubEventPublisher extends EventPublisher {
  private readonly topic: Topic;

  constructor(config: ConfigService<Env, true>) {
    super();
    // Application Default Credentials : le service account du service Cloud Run.
    // PUBSUB_EMULATOR_HOST, s'il est défini, redirige vers l'émulateur local.
    this.topic = new PubSub().topic(config.get('EVENTS_TOPIC'));
  }

  publish({ type, id, data, attributes }: DomainEvent): Promise<string> {
    return this.topic.publishMessage({
      json: data,
      attributes: { ...attributes, eventType: type, eventId: id },
    });
  }
}

export class NoopEventPublisher extends EventPublisher {
  publish(): Promise<null> {
    return Promise.resolve(null);
  }
}

export const eventPublisherProvider = {
  provide: EventPublisher,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): EventPublisher =>
    config.get('EVENTS_TOPIC')
      ? new PubSubEventPublisher(config)
      : new NoopEventPublisher(),
};
