export default function Avatar({ user, size = 32 }) {
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const style = { width: size, height: size };

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={`${user.firstName} ${user.lastName}`}
        style={style}
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
