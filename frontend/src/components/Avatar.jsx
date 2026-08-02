import { useState } from 'react';

export default function Avatar({ user, size = 32 }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const style = { width: size, height: size };
  const showImage = Boolean(user?.avatarUrl) && user.avatarUrl !== failedUrl;

  if (showImage) {
    return (
      <img
        src={user.avatarUrl}
        alt={displayName}
        style={style}
        onError={() => setFailedUrl(user.avatarUrl)}
        className="rounded-full border border-[#71717A]/30 object-cover"
      />
    );
  }

  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full border border-[#71717A]/30 bg-[#0c0c14] text-[10px] font-bold text-[#71717A]"
    >
      {initials}
    </div>
  );
}
