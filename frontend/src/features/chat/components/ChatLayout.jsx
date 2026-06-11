import React, { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { RoomSidebar, CreateRoomModal } from './RoomSidebar';
import { ChatRoom } from './ChatRoom';

/**
 * ChatLayout
 * Full chat experience: room sidebar + active room + members panel.
 *
 * @param {{ currentUserId: string }} props
 */
export function ChatLayout({ currentUserId }) {
  const { rooms, isLoading, createGroup, createDM, displayName } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const activeRoom = selectedRoom ?? rooms[0] ?? null;

  const handleCreated = (room) => {
    setSelectedRoom(room);
  };

  return (
    <div className="flex h-full min-h-0 rounded-xl border border-[#71717A]/25 overflow-hidden bg-[#0c0c14]">
      <RoomSidebar
        rooms={rooms}
        selectedRoomId={activeRoom?.id}
        onSelect={setSelectedRoom}
        displayName={displayName}
        onCreateClick={() => setModalOpen(true)}
        isLoading={isLoading}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {activeRoom ? (
          <ChatRoom
            roomId={activeRoom.id}
            currentUserId={currentUserId}
            roomName={displayName(activeRoom)}
            showMembers
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#71717A] text-sm">
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
