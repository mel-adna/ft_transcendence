import { useState, useEffect } from 'react';
import { useRooms } from '../hooks/useRooms';
import { RoomSidebar, CreateRoomModal } from './RoomSidebar';
import { ChatRoom } from './ChatRoom';

export function ChatLayout({ currentUserId }) {
  const {
    rooms,
    isLoading,
    createGroup,
    createDM,
    deleteRoom,
    leaveRoom,
    setActiveRoom,
    displayName,
    pendingRequests,
    respondToDM,
  } = useRooms(currentUserId);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState('list');

  const roomList = rooms ?? [];
  const activeRoom =
    roomList.find((r) => r.id === selectedRoomId) ?? roomList[0] ?? null;

  useEffect(() => {
    setActiveRoom(activeRoom?.id ?? null);
  }, [activeRoom?.id, setActiveRoom]);

  const isOwner =
    activeRoom?.type === 'GROUP' &&
    (activeRoom.myRole === 'OWNER' ||
      activeRoom.members?.some(
        (m) => m.userId === currentUserId && m.role === 'OWNER',
      ));

  const canLeave = activeRoom?.type === 'GROUP' && !isOwner;

  const isPendingDM =
    activeRoom?.type === 'DIRECT' &&
    activeRoom.members?.some((m) => m.userId !== currentUserId && m.status === 'PENDING');

  const handleSelect = (room) => {
    setSelectedRoomId(room.id);
    setMobileView('room');
  };

  const handleCreated = (room) => {
    setSelectedRoomId(room.id);
    setMobileView('room');
  };

  const handleDeleteRoom = async () => {
    if (!activeRoom) return;
    await deleteRoom(activeRoom.id);
    setSelectedRoomId(null);
    setMobileView('list');
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    await leaveRoom(activeRoom.id);
    setSelectedRoomId(null);
    setMobileView('list');
  };

  return (
    <div className="flex h-full min-h-0 rounded-xl border border-[#71717A]/25 overflow-hidden bg-[#0c0c14]">
      <div
        className={`${
          mobileView === 'list' ? 'flex' : 'hidden'
        } md:flex w-full md:w-56 shrink-0`}
      >
        <RoomSidebar
          rooms={roomList}
          selectedRoomId={activeRoom?.id}
          onSelect={handleSelect}
          displayName={displayName}
          onCreateClick={() => setModalOpen(true)}
          isLoading={isLoading}
          pendingRequests={pendingRequests}
          onRespondToDM={respondToDM}
        />
      </div>

      <div
        className={`${
          mobileView === 'room' ? 'flex' : 'hidden'
        } md:flex flex-1 min-w-0 flex-col`}
      >
        {activeRoom ? (
          <ChatRoom
            key={activeRoom.id}
            roomId={activeRoom.id}
            currentUserId={currentUserId}
            roomName={displayName(activeRoom)}
            roomType={activeRoom.type}
            isPendingDM={isPendingDM}
            canDelete={isOwner}
            canLeave={canLeave}
            onDeleteRoom={handleDeleteRoom}
            onLeaveRoom={handleLeaveRoom}
            onBack={() => setMobileView('list')}
            showMembers
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#71717A] text-sm px-4 text-center">
            Select or create a channel to start chatting
          </div>
        )}
      </div>

      <CreateRoomModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        createGroup={createGroup}
        createDM={createDM}
      />
    </div>
  );
}
