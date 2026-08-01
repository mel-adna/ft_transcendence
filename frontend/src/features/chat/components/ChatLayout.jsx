import React, { useState, useEffect } from 'react';
import { useRooms } from '../hooks/useRooms';
import { RoomSidebar, CreateRoomModal } from './RoomSidebar';
import { ChatRoom } from './ChatRoom';

/**
 * ChatLayout
 * Full chat experience: room sidebar + active room + members panel.
 *
 * Responsive: on screens < md it behaves as a master-detail view — the room
 * list and the open conversation are shown one at a time, with a back button.
 * On md+ both are shown side by side.
 *
 * @param {{ currentUserId: string }} props
 */
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
  } = useRooms();
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Mobile master-detail: which pane is showing.
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'room'

  // Resolve the active room from the live list so its members/roles stay fresh
  // (and so a deleted room falls back to the first available one).
  const activeRoom =
    rooms.find((r) => r.id === selectedRoomId) ?? rooms[0] ?? null;

  // Tell useRooms which room is in view so its messages don't count as unread
  // and its badge clears on open.
  useEffect(() => {
    setActiveRoom(activeRoom?.id ?? null);
  }, [activeRoom?.id, setActiveRoom]);

  // Prefer the server-computed myRole; fall back to scanning members.
  const isOwner =
    activeRoom?.type === 'GROUP' &&
    (activeRoom.myRole === 'OWNER' ||
      activeRoom.members?.some(
        (m) => m.userId === currentUserId && m.role === 'OWNER',
      ));

  const canLeave = activeRoom?.type === 'GROUP' && !isOwner;

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
      {/* Sidebar: always on md+, only in 'list' view on mobile */}
      <div
        className={`${
          mobileView === 'list' ? 'flex' : 'hidden'
        } md:flex w-full md:w-56 shrink-0`}
      >
        <RoomSidebar
          rooms={rooms}
          selectedRoomId={activeRoom?.id}
          onSelect={handleSelect}
          displayName={displayName}
          onCreateClick={() => setModalOpen(true)}
          isLoading={isLoading}
        />
      </div>

      {/* Conversation: always on md+, only in 'room' view on mobile */}
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
