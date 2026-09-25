import { inputClass } from './inputClass';

export default function IconInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      <Icon
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input {...props} className={`${inputClass} pl-10 ${className}`} />
    </div>
  );
}
