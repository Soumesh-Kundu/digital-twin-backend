import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { MachineStreamManager } from './machine_stream.manager';
import { MachinesService } from '../machines/machine.service';
import { Server, Socket } from 'socket.io';
import { MachinesStatus } from '@prisma/client';

@WebSocketGateway({ 
  cors: { origin: '*' },
  pingInterval: 10000,  // Send ping every 10 seconds
  pingTimeout: 5000,    // Wait 5 seconds for pong before disconnect
})
export class MachinesGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track which machines each client is subscribed to
  private clientSubscriptions: Map<string, Set<string>> = new Map();
  // Track which clients are admin (listen-only, don't affect stream lifecycle)
  private adminClients: Set<string> = new Set();

  constructor(
    private readonly streamManager: MachineStreamManager,
    private readonly machinesService: MachinesService,
  ) {}

  // Called when the gateway is initialized
  afterInit(server: Server) {
    this.streamManager.setServer(server);
    console.log('WebSocket Gateway initialized, server reference set');
  }

  @SubscribeMessage('subscribe_machine')
  async handleSubscribe(
    @MessageBody() payload: { machineId: string; isAdmin?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const isAdmin = payload.isAdmin === true;
    
    // Track if this client is admin
    if (isAdmin) {
      this.adminClients.add(client.id);
    }

    // Get machine to check its status
    const machine = await this.machinesService.findById(payload.machineId);
    
    const roomName = this.streamManager.roomName(payload.machineId);
    await client.join(roomName);

    // Only start streaming if machine is ACTIVE and client is NOT admin
    // Admin just listens to existing streams, doesn't trigger new ones
    if (machine.status === MachinesStatus.ACTIVE && !isAdmin) {
      const thresholds =
        await this.machinesService.getMetricsThresholds(payload.machineId);
      this.streamManager.ensureStream(payload.machineId, thresholds, this.server);
    }

    // Track this client's subscription
    if (!this.clientSubscriptions.has(client.id)) {
      this.clientSubscriptions.set(client.id, new Set());
    }
    this.clientSubscriptions.get(client.id)!.add(payload.machineId);

    return { 
      status: 'subscribed', 
      machineId: payload.machineId,
      streaming: machine.status === MachinesStatus.ACTIVE,
      machineStatus: machine.status,
      isAdmin,
    };
  }

  @SubscribeMessage('unsubscribe_machine')
  async handleUnsubscribe(
    @MessageBody() payload: { machineId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const isAdmin = this.adminClients.has(client.id);
    
    const roomName = this.streamManager.roomName(payload.machineId);
    await client.leave(roomName);

    // Remove from client's tracked subscriptions
    this.clientSubscriptions.get(client.id)?.delete(payload.machineId);

    // Only release stream if client is NOT admin
    // Admin leaving doesn't affect stream lifecycle
    if (!isAdmin) {
      this.streamManager.releaseStream(payload.machineId, this.server);
    }
    
    return { status: 'unsubscribed', machineId: payload.machineId };
  }

  // Called when a client disconnects (tab close, network issue, etc.)
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    const isAdmin = this.adminClients.has(client.id);
    
    // Get all machines this client was subscribed to
    const subscriptions = this.clientSubscriptions.get(client.id);
    
    if (subscriptions && !isAdmin) {
      // Release each machine stream (only for non-admin clients)
      subscriptions.forEach((machineId) => {
        console.log(`Releasing stream for machine ${machineId} due to client disconnect`);
        this.streamManager.releaseStream(machineId, this.server);
      });
    }
    
    // Clean up client tracking
    this.clientSubscriptions.delete(client.id);
    this.adminClients.delete(client.id);
  }
}
