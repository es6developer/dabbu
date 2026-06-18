import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGINS?.split(',') || ['https://dabbu.app']
        : '*',
    credentials: true,
  },
  namespace: '/ws/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.emit('error', 'Authentication required');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string);
      client.userId = payload.sub;

      client.join(`user:${payload.sub}`);

      this.logger.log(
        `Notification client connected: ${payload.email || payload.sub} (${client.id})`,
      );
    } catch {
      client.emit('error', 'Invalid token');
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      this.logger.log(`Notification client disconnected: ${client.userId} (${client.id})`);
    }
  }

  emitNotification(userId: string, notification: any) {
    this.server?.to(`user:${userId}`).emit('notification:new', notification);
  }
}
