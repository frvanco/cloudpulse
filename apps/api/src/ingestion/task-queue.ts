import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudTasksClient } from '@google-cloud/tasks';
import type { Env } from '../config/env.validation.js';

export interface QueuedHttpTask {
  // Identifiant de tâche : sert au dédoublonnage par Cloud Tasks.
  id: string;
  url: string;
}

// 'exists' : une tâche du même nom existe (ou a existé récemment).
export type EnqueueResult = 'created' | 'exists';

// Abstraction de la file : Cloud Tasks en production, une file factice en test.
export abstract class TaskQueue {
  abstract enqueue(task: QueuedHttpTask): Promise<EnqueueResult>;
}

const GRPC_ALREADY_EXISTS = 6;

@Injectable()
export class CloudTasksQueue extends TaskQueue {
  // Authentification par Application Default Credentials : le service account
  // du service Cloud Run, sans clé.
  private readonly client = new CloudTasksClient();

  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  async enqueue({ id, url }: QueuedHttpTask): Promise<EnqueueResult> {
    const queue = this.config.get('INGESTION_QUEUE');
    try {
      await this.client.createTask({
        parent: queue,
        task: {
          name: `${queue}/tasks/${id}`,
          httpRequest: {
            httpMethod: 'POST',
            url,
            // Cloud Tasks signe un jeton OIDC au nom de ce service account :
            // le service cible (privé) vérifie l'appelant via IAM (run.invoker).
            oidcToken: {
              serviceAccountEmail: this.config.get('INGESTION_INVOKER_SA'),
              audience: this.config.get('INGESTION_TARGET_URL'),
            },
          },
        },
      });
      return 'created';
    } catch (error) {
      if ((error as { code?: unknown }).code === GRPC_ALREADY_EXISTS) {
        return 'exists';
      }
      throw error;
    }
  }
}
