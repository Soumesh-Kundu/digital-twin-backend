import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { MachineStreamManager } from './machine_stream.manager';
import { MachinesService } from '../machines/machine.service';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class MachinesGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly streamManager: MachineStreamManager,
    private readonly machinesService: MachinesService,
  ) {}

  @SubscribeMessage('subscribe_machine')
  async handleSubscribe(
    @MessageBody() payload: { machineId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const thresholds =
      await this.machinesService.getMetricsThresholds(payload.machineId);

    const roomName = this.streamManager.roomName(payload.machineId);

    await client.join(roomName);
    this.streamManager.ensureStream(payload.machineId, thresholds, this.server);

    return { status: 'subscribed', machineId: payload.machineId };
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
