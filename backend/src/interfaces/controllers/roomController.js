const ListRoomsUseCase = require('../../application/rooms/ListRoomsUseCase');
const CreateRoomUseCase = require('../../application/rooms/CreateRoomUseCase');
const RoomService = require('../../domain/rooms/RoomService');
const RoomRepository = require('../../infrastructure/repositories/RoomRepository');
const Room = require('../../domain/rooms/Room');

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
};

const roomController = {
  async createGroup(req, res) {
    try {
      const { name } = req.body ?? {};
      const room = await CreateRoomUseCase.execute({
        creatorId: req.user.id,
        type: Room.TYPES.GROUP,
        name,
      });
      return res.status(201).json({ room });
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
