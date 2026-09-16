const ListRoomsUseCase = require('../../application/rooms/ListRoomsUseCase');
const CreateRoomUseCase = require('../../application/rooms/CreateRoomUseCase');
const InviteToRoomUseCase = require('../../application/rooms/InviteToRoomUseCase');
const DeleteRoomUseCase = require('../../application/rooms/DeleteRoomUseCase');
const LeaveRoomUseCase = require('../../application/rooms/LeaveRoomUseCase');
const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const Room = require('../../domain/rooms/Room');
const socketServer = require('../../infrastructure/socket/SocketServer');

const STATUS_MAP = {
  ROOM_INVALID_TYPE: 400,
  ROOM_NAME_REQUIRED: 400,
  ROOM_NAME_EMPTY: 400,
  ROOM_NAME_TOO_LONG: 400,
  ROOM_DM_TARGET_REQUIRED: 400,
  ROOM_DM_SELF: 400,
  ROOM_DM_USER_NOT_FOUND: 404,
  ROOM_NOT_FOUND: 404,
  ROOM_ACCESS_DENIED: 403,
  ROOM_NOT_MEMBER: 403,
  ROOM_INVITE_NO_USERS: 400,
  ROOM_CANNOT_INVITE_DM: 400,
  ROOM_INVITE_FORBIDDEN: 403,
  ROOM_ID_REQUIRED: 400,
  ROOM_NOT_DELETABLE: 400,
  ROOM_DELETE_FORBIDDEN: 403,
  ROOM_CANNOT_LEAVE_DM: 400,
};

const roomController = {
  async createGroup(req, res) {
    try {
      const { name, memberIds } = req.body ?? {};
      const room = await CreateRoomUseCase.execute({
        creatorId: req.user.id,
        type: Room.TYPES.GROUP,
        name,
        memberIds: Array.isArray(memberIds) ? memberIds : [],
      });
      return res.status(201).json({ room });
    } catch (err) {
      return _handleError(res, err);
    }
  },

  /**
   * POST /api/chat/rooms/:roomId/invite  { userIds: [] }
   * OWNER/ADMIN adds members; invited online users are joined + notified live.
   */
  async invite(req, res) {
    try {
      const { roomId } = req.params;
      const { userIds } = req.body ?? {};

      const { room, invitedUserIds } = await InviteToRoomUseCase.execute({
        roomId,
        inviterId: req.user.id,
        userIds,
      });

      for (const userId of invitedUserIds) {
        socketServer.joinUserToRoom(userId, roomId);
        socketServer.emitToUser(userId, 'room:joined', { roomId, room });
      }

      return res.json({ room, invitedUserIds });
    } catch (err) {
      return _handleError(res, err);
    }
  },

  /**
   * DELETE /api/chat/rooms/:roomId
   * Owner-only deletion of a GROUP room. Notifies every member live so their
   * UI drops the room immediately.
   */
  async deleteRoom(req, res) {
    try {
      const { roomId } = req.params;

      const { memberIds } = await DeleteRoomUseCase.execute({
        actorId: req.user.id,
        roomId,
      });

      for (const userId of memberIds) {
        socketServer.emitToUser(userId, 'room:deleted', { roomId });
      }

      return res.json({ ok: true, roomId });
    } catch (err) {
      return _handleError(res, err);
    }
  },

  /**
   * POST /api/chat/rooms/:roomId/leave
   * The requester leaves a GROUP room. Their sockets leave the room and remaining
   * members are notified so their member lists update.
   */
  async leaveRoom(req, res) {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      await LeaveRoomUseCase.execute({ userId, roomId });

      // Detach the leaver's sockets and tell their other tabs to drop the room.
      socketServer.leaveUserFromRoom(userId, roomId);
      socketServer.emitToUser(userId, 'room:left', { roomId });

      // Notify everyone still in the room so presence/member panels refresh.
      socketServer.getIO().to(roomId).emit('room:member_left', { roomId, userId });

      return res.json({ ok: true, roomId });
    } catch (err) {
      return _handleError(res, err);
    }
  },

  async createDM(req, res) {
    try {
      const { targetUserId } = req.body ?? {};
      const room = await CreateRoomUseCase.execute({
        creatorId: req.user.id,
        type: Room.TYPES.DIRECT,
        targetUserId,
      });
      return res.status(201).json({ room });
    } catch (err) {
      return _handleError(res, err);
    }
  },

  async listRooms(req, res) {
    try {
      const rooms = await ListRoomsUseCase.execute(req.user.id);
      return res.json({ rooms });
    } catch (err) {
      return _handleError(res, err);
    }
  },

  async getMembers(req, res) {
    try {
      const { roomId } = req.params;
      const requesterId = req.user.id;

      const room = await RoomRepository.findById(roomId);
      if (!room) throw new Error('ROOM_NOT_FOUND');

      RoomService.assertMember(requesterId, room);

      const members = await RoomRepository.getMembers(roomId);
      return res.json({
        members: members.map((m) => RoomService.buildMemberResponse(m)),
      });
    } catch (err) {
      return _handleError(res, err);
    }
  },
};

function _handleError(res, err) {
  const status = STATUS_MAP[err.message] ?? 500;
  return res.status(status).json({ error: err.message });
}

module.exports = roomController;
