import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { MachineStreamManager } from './machine_stream.manager';
import { MachinesService } from '../machines/machine.service';
import { Server, Socket } from 'socket.io';
import { MachinesStatus } from '@prisma/client';

@WebSocketGateway({ cors: { origin: '*' } })
export class MachinesGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

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
    @MessageBody() payload: { machineId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Get machine to check its status
    const machine = await this.machinesService.findById(payload.machineId);
    
    const roomName = this.streamManager.roomName(payload.machineId);
    await client.join(roomName);

    // Only start streaming if machine is ACTIVE
    if (machine.status === MachinesStatus.ACTIVE) {
      const thresholds =
        await this.machinesService.getMetricsThresholds(payload.machineId);
      this.streamManager.ensureStream(payload.machineId, thresholds, this.server);
    }

    return { 
      status: 'subscribed', 
      machineId: payload.machineId,
      streaming: machine.status === MachinesStatus.ACTIVE,
      machineStatus: machine.status,
    };
  }

  @SubscribeMessage('unsubscribe_machine')
  async handleUnsubscribe(
    @MessageBody() payload: { machineId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = this.streamManager.roomName(payload.machineId);
    await client.leave(roomName);

    this.streamManager.releaseStream(payload.machineId, this.server);
    return { status: 'unsubscribed', machineId: payload.machineId };
  }
}
